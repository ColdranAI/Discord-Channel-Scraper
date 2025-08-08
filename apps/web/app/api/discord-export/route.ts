import { NextResponse } from 'next/server';

interface DiscordMessage {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    avatar?: string;
  };
  timestamp: string;
}

const DISCORD_API_BASE = 'https://discord.com/api/v10';

async function fetchDiscordBatch(channelId: string, token: string, beforeId?: string, signal?: AbortSignal) {
  let url = `${DISCORD_API_BASE}/channels/${channelId}/messages?limit=50`;
  if (beforeId) url += `&before=${beforeId}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': token,
      'Content-Type': 'application/json',
    },
    signal: signal
  });

  if (!response.ok) {
    throw new Error(`Discord API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function POST(request: Request) {
  try {
    const { action, maxMessages = 500, channelId, discordToken } = await request.json();
    
    // Use provided credentials or fall back to environment variables
    const finalChannelId = channelId || process.env.CHANNEL_ID;
    const finalToken = discordToken || process.env.DISCORD_TOKEN;

    if (!finalChannelId || !finalToken) {
      return NextResponse.json(
        { error: 'Missing Channel ID or Discord Token. Please provide them in the form or set environment variables.' },
        { status: 400 }
      );
    }

    if (action === 'export') {
      console.log(`[Discord Export API] Starting export for channel ${finalChannelId}`);
      
      const allMessages: DiscordMessage[] = [];
      let beforeId: string | undefined;
      let batchCount = 0;
      const maxBatches = Math.ceil(maxMessages / 50);

      while (batchCount < maxBatches) {
        try {
          // Check if the request was cancelled
          if (request.signal?.aborted) {
            console.log(`[Discord Export API] Export cancelled by client`);
            return NextResponse.json(
              { error: 'Export cancelled by user' },
              { status: 499 }
            );
          }

          console.log(`[Discord Export API] Fetching batch ${batchCount + 1}/${maxBatches}`);
          
          const messages = await fetchDiscordBatch(finalChannelId, finalToken, beforeId, request.signal);
          
          if (messages.length === 0) {
            console.log(`[Discord Export API] No more messages to fetch`);
            break;
          }

          const validMessages = messages
            .filter((msg: any) => msg.content && msg.content.trim() !== '')
            .map((msg: any) => ({
              id: msg.id,
              content: msg.content,
              author: {
                id: msg.author.id,
                username: msg.author.username,
                avatar: msg.author.avatar 
                  ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png`
                  : null,
              },
              timestamp: msg.timestamp,
            }));

          allMessages.push(...validMessages);
          beforeId = messages[messages.length - 1].id;
          batchCount++;

          console.log(`[Discord Export API] Batch ${batchCount}: Found ${validMessages.length} valid messages`);
          
          // Rate limiting - wait 1 second between requests
          if (batchCount < maxBatches) {
            // Use a cancellable delay
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(resolve, 1000);
              
              if (request.signal) {
                request.signal.addEventListener('abort', () => {
                  clearTimeout(timeout);
                  reject(new Error('Request cancelled'));
                });
              }
            });
          }
        } catch (error) {
          // Handle cancellation errors
          if (error.name === 'AbortError' || error.message === 'Request cancelled') {
            console.log(`[Discord Export API] Export cancelled during batch ${batchCount + 1}`);
            return NextResponse.json(
              { error: 'Export cancelled by user' },
              { status: 499 }
            );
          }

          console.error(`[Discord Export API] Error in batch ${batchCount + 1}:`, error);
          
          // If it's an authentication error, provide helpful message
          if (error.message.includes('401')) {
            return NextResponse.json(
              { error: 'Invalid Discord token or unauthorized. Make sure you have access to the channel and your token is valid.' },
              { status: 401 }
            );
          }
          
          // If it's a channel not found error
          if (error.message.includes('404')) {
            return NextResponse.json(
              { error: 'Channel not found or not accessible. Check your Channel ID and make sure you have access to this channel.' },
              { status: 404 }
            );
          }
          
          // If it's a forbidden error
          if (error.message.includes('403')) {
            return NextResponse.json(
              { error: 'Access forbidden. You may not have permission to read messages in this channel.' },
              { status: 403 }
            );
          }
          
          break;
        }
      }

      console.log(`[Discord Export API] Export complete. Total messages: ${allMessages.length}`);

      return NextResponse.json({
        success: true,
        messages: allMessages,
        totalMessages: allMessages.length,
        batchesFetched: batchCount,
        channelId: finalChannelId,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Discord Export API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Discord Export API',
    endpoints: {
      POST: 'Trigger Discord export with { "action": "export", "maxMessages": 500, "channelId": "your_channel_id", "discordToken": "your_token" }'
    }
  });
} 