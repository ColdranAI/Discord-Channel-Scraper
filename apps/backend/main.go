package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		allowedOrigins := []string{
			"http://localhost:3000",
			"https://localhost:3000",
			"https://discord.nermalcat69.dev",
			"http://discord.nermalcat69.dev",
		}
		
		for _, allowed := range allowedOrigins {
			if origin == allowed {
				return true
			}
		}
		
		// Allow if no origin header (direct connections)
		if origin == "" {
			return true
		}
		
		log.Printf("WebSocket connection denied from origin: %s", origin)
		return false
	},
}

// Storage for scraped content
type ScrapedContent struct {
	Content   string
	Timestamp time.Time
	ChannelID string
}

var (
	scrapedData = make(map[string]*ScrapedContent)
	dataMutex   = sync.RWMutex{}
)

type Message struct {
	ID      string `json:"id"`
	Content string `json:"content"`
	Author  struct {
		ID       string `json:"id"`
		Username string `json:"username"`
		Avatar   string `json:"avatar"`
	} `json:"author"`
	Timestamp string `json:"timestamp"`
}

type WebSocketMessage struct {
	Type    string      `json:"type"`
	Data    interface{} `json:"data"`
	Message string      `json:"message,omitempty"`
}

type StartExportMessage struct {
	Action       string `json:"action"`
	ChannelID    string `json:"channelId"`
	DiscordToken string `json:"discordToken"`
	MaxMessages  int    `json:"maxMessages"`
}

type BatchResult struct {
	Set           int      `json:"set"`
	MessagesFound int      `json:"messagesFound"`
	TotalMessages int      `json:"totalMessages"`
	NewContent    []string `json:"newContent"`
}

type ExportComplete struct {
	Success       bool   `json:"success"`
	TotalMessages int    `json:"totalMessages"`
	BatchesTotal  int    `json:"batchesTotal"`
	DownloadID    string `json:"downloadId"`
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		allowedOrigins := []string{
			"http://localhost:3000",
			"https://localhost:3000",
			os.Getenv("WEBSITE_URL"),
		}
		
		for _, allowed := range allowedOrigins {
			if origin == allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				break
			}
		}
		
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next.ServeHTTP(w, r)
	}
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using environment variables")
	}

	http.HandleFunc("/ws", handleWebSocket)
	http.HandleFunc("/download/", corsMiddleware(handleDownload))
	
	port := os.Getenv("PORT")
	if port == "" {
		port = "8001"
	}

	// Get domain from environment variables
	domain := os.Getenv("DOMAIN")
	if domain == "" {
		domain = "localhost"
	}

	// Determine protocol based on domain
	wsProtocol := "ws"
	httpProtocol := "http"
	if domain != "localhost" {
		wsProtocol = "wss"
		httpProtocol = "https"
	}

	log.Printf("Discord Export server starting on port %s", port)
	if domain == "localhost" {
		log.Printf("WebSocket endpoint: %s://%s:%s/ws", wsProtocol, domain, port)
		log.Printf("Download endpoint: %s://%s:%s/download/{id}", httpProtocol, domain, port)
	} else {
		log.Printf("WebSocket endpoint: %s://%s/ws", wsProtocol, domain)
		log.Printf("Download endpoint: %s://%s/download/{id}", httpProtocol, domain)
	}
	
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	log.Println("Client connected")
	
	sendMessage(conn, WebSocketMessage{
		Type:    "connected",
		Message: "Connected to Websocket [Backend]",
	})

	for {
		var msg StartExportMessage
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Println("Read error:", err)
			break
		}

		if msg.Action == "export" {
			go handleExport(conn, msg)
		}
	}
}

func sendMessage(conn *websocket.Conn, msg WebSocketMessage) {
	if err := conn.WriteJSON(msg); err != nil {
		log.Println("Write error:", err)
	}
}

func handleDownload(w http.ResponseWriter, r *http.Request) {
	// Extract download ID from URL path
	downloadID := strings.TrimPrefix(r.URL.Path, "/download/")
	if downloadID == "" {
		http.Error(w, "Download ID required", http.StatusBadRequest)
		return
	}

	// Get scraped content
	dataMutex.RLock()
	content, exists := scrapedData[downloadID]
	dataMutex.RUnlock()

	if !exists {
		http.Error(w, "Download not found or expired", http.StatusNotFound)
		return
	}

	// Set headers for file download
	filename := fmt.Sprintf("discord-channel-%s-%s.txt", content.ChannelID, content.Timestamp.Format("2006-01-02"))
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	w.Header().Set("Content-Length", strconv.Itoa(len(content.Content)))
	w.Header().Set("X-Channel-ID", content.ChannelID)

	// Send the content
	w.WriteHeader(http.StatusOK)
	w.Write([]byte(content.Content))

	log.Printf("File downloaded: %s (%.2f KB)", filename, float64(len(content.Content))/1024)
}

func handleExport(conn *websocket.Conn, config StartExportMessage) {
	channelID := config.ChannelID
	authToken := config.DiscordToken
	maxMessages := config.MaxMessages
	
	if maxMessages == 0 {
		maxMessages = 500
	}

	if channelID == "" || authToken == "" {
		sendMessage(conn, WebSocketMessage{
			Type:    "error",
			Message: "Missing Channel ID or Discord Token",
		})
		return
	}

	// Generate unique download ID
	downloadID := fmt.Sprintf("%s-%d", channelID, time.Now().Unix())
	var allContent strings.Builder
	
	var beforeID string
	set := 1
	totalMessages := 0

	sendMessage(conn, WebSocketMessage{
		Type:    "log",
		Message: "Starting content-only scrape...",
	})

	sendMessage(conn, WebSocketMessage{
		Type:    "log",
		Message: fmt.Sprintf("Channel ID: %s", channelID),
	})

	maxBatches := (maxMessages + 49) / 50 // Round up division

	for set <= maxBatches {
		sendMessage(conn, WebSocketMessage{
			Type:    "log",
			Message: fmt.Sprintf("Fetching batch %d/%d", set, maxBatches),
		})

		hasMore, newBeforeID, messagesCount, newContent, err := fetchBatch(channelID, authToken, beforeID, set)
		if err != nil {
			sendMessage(conn, WebSocketMessage{
				Type:    "error",
				Message: fmt.Sprintf("Error in batch %d: %v", set, err),
			})
			break
		}

		if !hasMore {
			sendMessage(conn, WebSocketMessage{
				Type:    "log",
				Message: "No more messages to fetch",
			})
			break
		}

		totalMessages += messagesCount
		beforeID = newBeforeID

		sendMessage(conn, WebSocketMessage{
			Type:    "log",
			Message: fmt.Sprintf("Set %d: Saved %d lines", set, messagesCount),
		})

		// Debug: Log the content being sent
		if len(newContent) > 0 {
			sampleLen := 50
			if len(newContent[0]) < sampleLen {
				sampleLen = len(newContent[0])
			}
			log.Printf("Sending %d messages for set %d, sample: '%s'", len(newContent), set, newContent[0][:sampleLen])
		} else {
			log.Printf("No content to send for set %d", set)
		}

		// Accumulate content for download
		if len(newContent) > 0 {
			for _, line := range newContent {
				allContent.WriteString(line)
				allContent.WriteString("\n")
			}
		}

		sendMessage(conn, WebSocketMessage{
			Type: "progress",
			Data: BatchResult{
				Set:           set,
				MessagesFound: messagesCount,
				TotalMessages: totalMessages,
				NewContent:    newContent,
			},
		})

		set++
		
		if set <= maxBatches {
			sendMessage(conn, WebSocketMessage{
				Type:    "log",
				Message: "Waiting 1.5 seconds before next batch...",
			})
			time.Sleep(1500 * time.Millisecond)
		}
	}

	sendMessage(conn, WebSocketMessage{
		Type:    "log",
		Message: "Export completed!",
	})

	sendMessage(conn, WebSocketMessage{
		Type:    "log",
		Message: fmt.Sprintf("Total messages exported: %d", totalMessages),
	})

	sendMessage(conn, WebSocketMessage{
		Type:    "log",
		Message: fmt.Sprintf("Batches processed: %d", set-1),
	})

	// Store content for download
	contentStr := allContent.String()
	dataMutex.Lock()
	scrapedData[downloadID] = &ScrapedContent{
		Content:   contentStr,
		Timestamp: time.Now(),
		ChannelID: channelID,
	}
	dataMutex.Unlock()

	sendMessage(conn, WebSocketMessage{
		Type:    "log",
		Message: fmt.Sprintf("Content ready for download (%.2f KB)", float64(len(contentStr))/1024),
	})

	sendMessage(conn, WebSocketMessage{
		Type: "complete",
		Data: ExportComplete{
			Success:       true,
			TotalMessages: totalMessages,
			BatchesTotal:  set - 1,
			DownloadID:    downloadID,
		},
	})
}

func fetchBatch(channelID, authToken, beforeID string, set int) (bool, string, int, []string, error) {
	url := fmt.Sprintf("https://discord.com/api/v8/channels/%s/messages?limit=50", channelID)
	if beforeID != "" {
		url += fmt.Sprintf("&before=%s", beforeID)
	}

	client := &http.Client{}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return false, "", 0, nil, err
	}

	req.Header.Set("Authorization", authToken)

	resp, err := client.Do(req)
	if err != nil {
		return false, "", 0, nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return false, "", 0, nil, fmt.Errorf("API request failed with status %d: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return false, "", 0, nil, err
	}

	var messages []Message
	err = json.Unmarshal(body, &messages)
	if err != nil {
		return false, "", 0, nil, err
	}

	if len(messages) == 0 {
		return false, "", 0, nil, nil
	}

	var lines []string
	for _, msg := range messages {
		content := strings.TrimSpace(msg.Content)
		if content != "" {
			lines = append(lines, content)
		}
	}

	// No file writing - just return the content to be sent to client

	newBeforeID := messages[len(messages)-1].ID
	return true, newBeforeID, len(lines), lines, nil
} 