'use client';

import { useState, useEffect, useRef } from 'react';
import styles from '../styles/Home.module.scss';

interface ExportResultsProps {
  messages: any[];
  logs: string[];
  scrapedText: string;
  downloadId: string;
  isExporting: boolean;
}

export default function ExportResults({ messages, logs, scrapedText, downloadId, isExporting }: ExportResultsProps) {
  const [activeTab, setActiveTab] = useState<'console' | 'content'>('console');
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copying' | 'success' | 'error'>('idle');
  const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');
  const logsContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);

  // Reset button states after timeout
  useEffect(() => {
    if (copyState === 'success' || copyState === 'error') {
      const timer = setTimeout(() => setCopyState('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [copyState]);

  useEffect(() => {
    if (downloadState === 'success' || downloadState === 'error') {
      const timer = setTimeout(() => setDownloadState('idle'), 2000);
      return () => clearTimeout(timer);
    }
  }, [downloadState]);

  // Debug: Track scraped text changes
  useEffect(() => {
    if (scrapedText) {
      console.log('Scraped text updated, length:', scrapedText.length);
      console.log('Line count:', scrapedText.split('\n').filter(line => line.trim()).length);
      console.log('Sample content (first 100 chars):', scrapedText.substring(0, 100));
    }
  }, [scrapedText]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isAutoScroll && logsContainerRef.current && activeTab === 'console') {
      const container = logsContainerRef.current;
      container.scrollTop = container.scrollHeight;
    }
  }, [logs, isAutoScroll, activeTab]);

  // Handle scroll events to detect manual scrolling
  useEffect(() => {
    const container = logsContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5; // 5px tolerance

      if (isUserScrollingRef.current) {
        // User is manually scrolling
        if (isAtBottom) {
          // User scrolled to bottom, enable auto-scroll
          setIsAutoScroll(true);
          setShowScrollButton(false);
        } else {
          // User scrolled up, disable auto-scroll
          setIsAutoScroll(false);
          setShowScrollButton(true);
        }
      }
    };

    container.addEventListener('scroll', handleScroll);

    // Detect user-initiated scrolling
    const handleWheel = () => {
      isUserScrollingRef.current = true;
      setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 100);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
        isUserScrollingRef.current = true;
        setTimeout(() => {
          isUserScrollingRef.current = false;
        }, 100);
      }
    };

    container.addEventListener('wheel', handleWheel);
    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const scrollToBottom = () => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
      setIsAutoScroll(true);
      setShowScrollButton(false);
    }
  };

  const copyToClipboard = async () => {
    if (!scrapedText.trim()) {
      setCopyState('error');
      return;
    }
    
    if (copyState === 'copying') return; // Prevent double-click
    
    setCopyState('copying');
    console.log('Copying to clipboard, content length:', scrapedText.length);
    
    try {
      await navigator.clipboard.writeText(scrapedText);
      setCopyState('success');
      console.log(`Scraped content copied to clipboard! (${scrapedText.split('\n').filter(line => line.trim()).length} lines)`);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopyState('error');
    }
  };

  const downloadAsFile = async () => {
    if (!downloadId) {
      setDownloadState('error');
      return;
    }
    
    if (downloadState === 'downloading') return; // Prevent double-click
    
    setDownloadState('downloading');
    console.log('Downloading file with download ID:', downloadId);
    
    try {
      // Create download link to backend endpoint
      const baseUrl = process.env.NEXT_PUBLIC_DOWNLOAD_URL || 'https://websocket-d6f-8001.prg1.zerops.app';
      const downloadUrl = `${baseUrl}/download/${downloadId}`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setDownloadState('success');
      console.log(`Download initiated for ID: ${downloadId}`);
    } catch (err) {
      console.error('Failed to download file: ', err);
      setDownloadState('error');
    }
  };

  const getCopyButtonContent = () => {
    switch (copyState) {
      case 'copying':
        return 'Copying...';
      case 'success':
        return 'Copied!';
      case 'error':
        return 'Failed';
      default:
        return 'Copy';
    }
  };

  const getDownloadButtonContent = () => {
    switch (downloadState) {
      case 'downloading':
        return 'Downloading...';
      case 'success':
        return 'Downloaded!';
      case 'error':
        return 'Failed';
      default:
        return 'Download';
    }
  };

  const getCopyButtonStyle = () => {
    const baseStyle = {
      padding: '6px 12px',
      backgroundColor: '#21262d',
      border: '1px solid #30363d',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      minWidth: '80px'
    };

    if (!scrapedText.trim()) {
      return {
        ...baseStyle,
        backgroundColor: '#161b22',
        color: '#8b949e',
        cursor: 'not-allowed',
        opacity: 0.6
      };
    }

    switch (copyState) {
      case 'copying':
        return {
          ...baseStyle,
          color: '#fbbf24',
          cursor: 'not-allowed'
        };
      case 'success':
        return {
          ...baseStyle,
          color: '#10b981',
          cursor: 'default'
        };
      case 'error':
        return {
          ...baseStyle,
          color: '#ef4444',
          cursor: 'pointer'
        };
      default:
        return {
          ...baseStyle,
          color: '#c9d1d9'
        };
    }
  };

  const getDownloadButtonStyle = () => {
    const baseStyle = {
      padding: '6px 12px',
      backgroundColor: '#21262d',
      border: '1px solid #30363d',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      minWidth: '100px'
    };

    if (!downloadId) {
      return {
        ...baseStyle,
        backgroundColor: '#161b22',
        color: '#8b949e',
        cursor: 'not-allowed',
        opacity: 0.6
      };
    }

    switch (downloadState) {
      case 'downloading':
        return {
          ...baseStyle,
          color: '#fbbf24',
          cursor: 'not-allowed'
        };
      case 'success':
        return {
          ...baseStyle,
          color: '#10b981',
          cursor: 'default'
        };
      case 'error':
        return {
          ...baseStyle,
          color: '#ef4444',
          cursor: 'pointer'
        };
      default:
        return {
          ...baseStyle,
          color: '#c9d1d9'
        };
    }
  };

  return (
    <div style={{ 
      marginTop: '20px', 
      border: '1px solid #30363d', 
      borderRadius: '6px',
      backgroundColor: '#0d1117',
      overflow: 'hidden'
    }}>
      {/* Tab Headers */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #30363d',
        backgroundColor: '#161b22'
      }}>
        <button
          onClick={() => setActiveTab('console')}
          style={{
            padding: '12px 20px',
            backgroundColor: activeTab === 'console' ? '#0d1117' : 'transparent',
            color: activeTab === 'console' ? '#c9d1d9' : '#8b949e',
            border: 'none',
            borderBottom: activeTab === 'console' ? '2px solid #66e6f4' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          Console
        </button>
        <button
          onClick={() => setActiveTab('content')}
          style={{
            padding: '12px 20px',
            backgroundColor: activeTab === 'content' ? '#0d1117' : 'transparent',
            color: activeTab === 'content' ? '#c9d1d9' : '#8b949e',
            border: 'none',
            borderBottom: activeTab === 'content' ? '2px solid #66e6f4' : '2px solid transparent',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          Scraped Content ({scrapedText.split('\n').filter(line => line.trim()).length} lines)
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ 
        padding: '20px',
        height: '400px',
        overflowY: 'auto',
        position: 'relative'
      }}
      >
        {activeTab === 'console' && (
          <div>
            <h4 style={{ color: '#c9d1d9', marginTop: '0', marginBottom: '15px' }}>
              Console Logs
            </h4>
            <div 
              ref={logsContainerRef}
              style={{ 
                padding: '15px',
                borderRadius: '4px',
                fontFamily: '"Fira Code", "Consolas", "Monaco", "Courier New", monospace',
                fontSize: '11px',
                lineHeight: '1.4',
                border: '1px solid #30363d',
                height: '300px',
                overflowY: 'auto'
              }}>
              {logs.length === 0 && !isExporting ? (
                <div style={{ color: '#7d8590', fontStyle: 'italic' }}>
                  <span style={{ color: '#7d8590' }}>$</span> Ready to scrape. Click "Scrape Discord Messages" to start...
                </div>
              ) : logs.length === 0 && isExporting ? (
                <div style={{ color: '#f78166' }}>
                  <span style={{ color: '#7d8590' }}>[INFO]</span> <span style={{ color: '#ffa657' }}>🔄</span> Initializing export...
                </div>
              ) : (
                logs.map((log, index) => {
                  const getLogStyle = (logText: string) => {
                    if (logText.includes('Error') || logText.includes('error')) {
                      return {
                        color: '#f85149',
                        prefix: '[ERROR]',
                        prefixColor: '#f85149'
                      };
                    }
                    if (logText.includes('Success') || logText.includes('completed')) {
                      return {
                        color: '#3fb950',
                        prefix: '[SUCCESS]',
                        prefixColor: '#3fb950'
                      };
                    }
                    if (logText.includes('Warning') || logText.includes('warning')) {
                      return {
                        color: '#d29922',
                        prefix: '[WARN]',
                        prefixColor: '#d29922',
                      };
                    }
                    if (logText.includes('Progress') || logText.includes('Set ')) {
                      return {
                        color: '#58a6ff',
                        prefix: '[PROGRESS]',
                        prefixColor: '#58a6ff',
                      };
                    }
                    if (logText.includes('Starting') || logText.includes('Fetching')) {
                      return {
                        color: '#f78166',
                        prefix: '[INFO]',
                        prefixColor: '#f78166',
                      };
                    }
                    return {
                      color: '#c9d1d9',
                      prefix: '[INFO]',
                      prefixColor: '#7d8590',
                    };
                  };

                  const style = getLogStyle(log);
                  
                  return (
                    <div key={index} style={{ 
                      marginBottom: '2px',
                      fontWeight: '400'
                    }}>
                      <span style={{ color: style.prefixColor, fontWeight: 'bold' }}>{style.prefix}</span>
                      <span style={{ color: style.color, marginLeft: '8px' }}>
                        {log.replace(/^\[[^\]]*\]\s*/, '')}
                      </span>
                    </div>
                  );
                })
              )}
              {isExporting && (
                <div style={{ color: '#f78166', marginTop: '8px', fontWeight: 'bold' }}>
                  <span style={{ color: '#f78166' }}>[INFO]</span> Export in progress...
                </div>
              )}
            </div>
            
            {/* Trail Logs Button */}
            {showScrollButton && activeTab === 'console' && (
              <button
                onClick={scrollToBottom}
                style={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '20px',
                  backgroundColor: '#30363d',
                  color: '#c9d1d9',
                  border: '1px solid #21262d',
                  borderRadius: '20px',
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
                  zIndex: 10,
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#21262d';
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#30363d';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <span>Trail Logs</span>
              </button>
            )}
          </div>
        )}

        {activeTab === 'content' && (
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <div>
                <h4 style={{ color: '#c9d1d9', margin: '0' }}>
                  Scraped Content
                </h4>
                {scrapedText.trim() && (
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#8b949e',
                    marginTop: '4px'
                  }}>
                    {scrapedText.split('\n').filter(line => line.trim()).length} lines • {scrapedText.length} characters
                  </div>
                )}
              </div>
              {(scrapedText.trim() || downloadId) && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={copyToClipboard}
                    disabled={!scrapedText.trim()}
                    style={getCopyButtonStyle()}
                  >
                    {getCopyButtonContent()}
                  </button>
                  <button
                    onClick={() => window.open('https://x.com/intent/user?screen_name=ArjunShips', '_blank')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#21262d',
                      border: '1px solid #30363d',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#c9d1d9',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      minWidth: '100px'
                    }}
                  >
                    Follow Coldran
                  </button>
                  <button
                    onClick={downloadAsFile}
                    disabled={!downloadId}
                    style={getDownloadButtonStyle()}
                  >
                    {getDownloadButtonContent()}
                  </button>
                </div>
              )}
            </div>
            
            {!scrapedText.trim() ? (
              <div style={{ 
                color: '#8b949e',
                textAlign: 'center',
                padding: '40px 20px'
              }}>
                {isExporting ? (
                  <>
                    Scraping messages from Discord...
                    <br />
                    <small style={{ marginTop: '10px', display: 'block' }}>
                      Content will appear here as messages are fetched.
                    </small>
                  </>
                ) : (
                  <>
                    No content scraped yet.
                    <br />
                    <small style={{ marginTop: '10px', display: 'block' }}>
                      Start scraping to see content here.
                    </small>
                  </>
                )}
              </div>
            ) : (
              <div style={{ 
                backgroundColor: '#0d1117',
                padding: '15px',
                borderRadius: '4px',
                border: '1px solid #30363d',
                height: '300px',
                overflowY: 'auto',
                fontFamily: '"Fira Code", "Consolas", "Monaco", "Courier New", monospace',
                fontSize: '12px',
                lineHeight: '1.4',
                color: '#c9d1d9',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {scrapedText}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 