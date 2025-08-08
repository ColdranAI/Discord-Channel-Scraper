'use client';

import { useState, useRef, useEffect } from 'react';
import styles from '../styles/Home.module.scss';
import ExportResults from './export-results';

export default function DiscordExportButton() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [channelId, setChannelId] = useState('');
  const [discordToken, setDiscordToken] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [scrapedText, setScrapedText] = useState<string>('');
  const [downloadId, setDownloadId] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'wss://websocket-d6f-8001.prg1.zerops.app/ws';
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          console.log('WebSocket connected successfully');
        };

        ws.onmessage = (event) => {
          console.log('WebSocket message received:', event.data);
          const data = JSON.parse(event.data);
          console.log('Parsed WebSocket data:', data);
          handleWebSocketMessage(data);
        };

        ws.onclose = () => {
          setIsConnected(false);
          addLog('Disconnected from server');
          // Attempt to reconnect after 3 seconds
          setTimeout(() => {
            if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
              connectWebSocket();
            }
          }, 3000);
        };

        ws.onerror = (error) => {
          addLog('WebSocket error - make sure Go backend is running on port 8001');
          setError('Connection error - make sure Go backend is running');
        };
      } catch (error) {
        addLog('Failed to connect to WebSocket server');
        setError('Failed to connect to server');
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'connected':
        addLog(data.message);
        break;
      case 'log':
        addLog(data.message);
        break;
      case 'progress':
        addLog(`Progress: Set ${data.data.set}, Messages: ${data.data.messagesFound}, Total: ${data.data.totalMessages}`);
        console.log('Progress data:', data.data);
        console.log('New content:', data.data.newContent);
        // Add new content to scraped text
        if (data.data.newContent && data.data.newContent.length > 0) {
          console.log('Adding content to scraped text:', data.data.newContent);
          setScrapedText(prev => {
            const newText = prev + data.data.newContent.join('\n') + '\n';
            console.log('Updated scraped text length:', newText.length);
            return newText;
          });
        } else {
          console.log('No new content in this progress message');
        }
        break;
      case 'complete':
        addLog('Export completed successfully!');
        setExportResult(data.data);
        setDownloadId(data.data.downloadId || '');
        setIsExporting(false);
        console.log('Download ID received:', data.data.downloadId);
        break;
      case 'error':
        addLog(`Error: ${data.message}`);
        setError(data.message);
        setIsExporting(false);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const handleStop = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
      addLog('Export cancelled by user');
      setIsExporting(false);
      setError('Export was cancelled');
    }
  };

  const handleExport = async () => {
    if (!channelId.trim() || !discordToken.trim()) {
      setError('Please enter both Channel ID and Discord Token');
      addLog('Error: Missing Channel ID or Discord Token');
      return;
    }

    if (!isConnected || !wsRef.current) {
      setError('Not connected to server. Please wait for connection or restart the Go backend.');
      addLog('Error: Not connected to WebSocket server');
      return;
    }

    setIsExporting(true);
    setError(null);
    setExportResult(null);
    setMessages([]);
    setScrapedText('');
    setDownloadId('');
    setLogs([]);

    try {
      addLog('Starting Discord export...');
      addLog(`Channel ID: ${channelId.trim()}`);
      addLog('Sending request to Go backend...');
      
      // Send export request via WebSocket
      const exportMessage = {
        action: 'export',
        channelId: channelId.trim(),
        discordToken: discordToken.trim(),
        maxMessages: 500
      };

      wsRef.current.send(JSON.stringify(exportMessage));
      
    } catch (err) {
      console.error('[Frontend] Export error:', err);
      addLog(`Error: ${err.message}`);
      setError(err.message);
      setIsExporting(false);
    }
  };

  const handleClearLogs = () => {
    setLogs([]);
    setMessages([]);
    setScrapedText('');
    setDownloadId('');
    setExportResult(null);
    setError(null);
  };

  return (
    <div style={{ paddingTop: '100px' }}>
      <div style={{ 
        marginBottom: '20px', 
        padding: '20px', 
        border: '1px solid #30363d', 
        borderRadius: '6px',
        backgroundColor: '#0d1117'
      }}>
        <h3 style={{ color: '#c9d1d9', marginTop: '0', marginBottom: '15px' }}>
          Discord Channel Export via <a href="https://x.com/ArjunShips" style={{ textDecoration: 'underline' }} target="_blank" rel="noopener noreferrer">Arjun Aditya</a>
        </h3>
        
        <div style={{ 
          marginBottom: '15px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          fontSize: '14px'
        }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            backgroundColor: isConnected ? '#7a7a7a' : '#dc3545' 
          }}></div>
          <span style={{ color: isConnected ? '#7a7a7a' : '#dc3545' }}>
            {isConnected ? 'Connected to WebSocket' : 'Disconnected - Start Go backend on port 8001'}
          </span>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'block', 
            color: '#c9d1d9', 
            marginBottom: '5px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            Channel ID:
          </label>
          <input
            type="text"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            placeholder="Right-click Discord channel → Copy ID"
            disabled={isExporting}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: isExporting ? '#161b22' : '#21262d',
              border: '1px solid #30363d',
              borderRadius: '4px',
              color: isExporting ? '#8b949e' : '#c9d1d9',
              fontSize: '14px',
              fontFamily: 'monospace',
              cursor: isExporting ? 'not-allowed' : 'text'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ 
            display: 'block', 
            color: '#c9d1d9', 
            marginBottom: '5px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            Discord Token:
          </label>
          <textarea
            value={discordToken}
            onChange={(e) => setDiscordToken(e.target.value)}
            placeholder="your_discord_token_here"
            rows={3}
            disabled={isExporting}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: isExporting ? '#161b22' : '#21262d',
              border: '1px solid #30363d',
              borderRadius: '4px',
              color: isExporting ? '#8b949e' : '#c9d1d9',
              fontSize: '14px',
              fontFamily: 'monospace',
              resize: 'vertical',
              cursor: isExporting ? 'not-allowed' : 'text'
            }}
          />
          <small style={{ color: '#8b949e', fontSize: '12px' }}>
            Use your Discord user token (from browser dev tools) - we don't save your token + use an alt account. NEVER SHARE YOUR TOKEN WITH ANYONE.
          </small>
        </div>

        <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
          <button
            onClick={isExporting ? handleStop : handleExport}
            disabled={!isConnected && !isExporting}
            style={{
              padding: '10px 20px',
              backgroundColor: isExporting ? '#da3633' : (!isConnected ? '#6c757d' : '#367ff5'),
              color: isExporting ? '#fff' : (!isConnected ? '#fff' : '#fff'),
              border: 'none',
              borderRadius: '4px',
              cursor: (!isConnected && !isExporting) ? 'not-allowed' : 'pointer',
              fontWeight: 'semibold',
              fontSize: '14px',
              opacity: (!isConnected && !isExporting) ? 0.6 : 1
            }}
          >
            {isExporting ? 'Stop Scraping' : (!isConnected ? 'Connect to Go Backend' : 'Scrape Discord Messages')}
          </button>
          
          {(logs.length > 0 || messages.length > 0) && (
            <button
              onClick={handleClearLogs}
              disabled={isExporting}
              style={{
                padding: '10px 20px',
                backgroundColor: '#21262d',
                color: '#c9d1d9',
                border: '1px solid #30363d',
                borderRadius: '4px',
                cursor: isExporting ? 'not-allowed' : 'pointer',
                fontSize: '14px'
              }}
            >
              Clear Results
            </button>
          )}
        </div>

        {error && (
          <div style={{ color: '#ff6b6b', fontSize: '14px', marginBottom: '10px' }}>
            ❌ Error: {error}
          </div>
        )}
      </div>

      <ExportResults 
        messages={messages}
        logs={logs}
        scrapedText={scrapedText}
        downloadId={downloadId}
        isExporting={isExporting}
      />
    </div>
  );
} 