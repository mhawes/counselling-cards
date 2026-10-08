using System.Collections.Concurrent;
using System.Collections.Generic;
using Microsoft.AspNetCore.SignalR;
using TableStateServer.Models;

namespace TableStateServer.Hubs;

/// <summary>
/// SignalR hub for broadcasting table state between clients.
/// One client broadcasts card positions, and all other connected clients receive and render them.
/// </summary>
public class TableStateHub : Hub
{
    /// <summary>
    /// Tracks which tables each connection ID is a member of.
    /// This ensures OnDisconnectedAsync only cleans up the tables the connection actually joined.
    /// </summary>
    private static readonly ConcurrentDictionary<string, HashSet<string>> ConnectionTables = new();

    /// <summary>
    /// Tracks the number of active connections per table.
    /// </summary>
    public static readonly ConcurrentDictionary<string, int> ActiveTables = new();

    /// <summary>
    /// Stores the current table state for each active table, so new clients can retrieve it on join.
    /// </summary>
    public static readonly ConcurrentDictionary<string, TableState> TableStates = new();

    /// <summary>
    /// Get the list of active tables (tables with at least one connected client).
    /// </summary>
    public IReadOnlyDictionary<string, int> GetActiveTables()
    {
        return new Dictionary<string, int>(ActiveTables);
    }
    /// <summary>
    /// Called by a client to broadcast the current table state to all other connected clients.
    /// </summary>
    public async Task BroadcastTableState(TableState tableState)
    {
        tableState.Timestamp = DateTime.UtcNow;
        await Clients.Others.SendAsync("ReceiveTableState", tableState);
    }

    /// <summary>
    /// Called by a client to broadcast the current table state to all clients, including the sender.
    /// </summary>
    public async Task BroadcastTableStateToAll(TableState tableState)
    {
        tableState.Timestamp = DateTime.UtcNow;
        await Clients.All.SendAsync("ReceiveTableState", tableState);
    }

    /// <summary>
    /// Called when a client joins a table group to receive updates for that table.
    /// Returns the current table state if one exists, so the new client can render the existing layout.
    /// </summary>
    public async Task<TableState?> JoinTable(string tableId)
    {
        var connectionId = Context.ConnectionId;
        Console.WriteLine($"[SignalR] JoinTable: connection {connectionId} joining table {tableId}");
        
        // Check state BEFORE adding to group — this tells us if we're the first client
        bool hasExistingState = TableStates.TryGetValue(tableId, out TableState? currentState);
        
        await Groups.AddToGroupAsync(connectionId, tableId);
        
        // Track that this connection is in this table
        ConnectionTables.AddOrUpdate(connectionId, 
            new HashSet<string> { tableId },
            (_, tables) => { tables.Add(tableId); return tables; });
        
        int newCount = ActiveTables.AddOrUpdate(tableId, 1, (_, count) => count + 1);
        Console.WriteLine($"[SignalR] ActiveTables count for {tableId}: {newCount}");
        Console.WriteLine($"[SignalR] Connection {connectionId} tables: {string.Join(", ", ConnectionTables[connectionId])}");
        
        await Clients.All.SendAsync("ClientJoinedTable", tableId, connectionId);

        // If there's existing state, return it so the joining client can render it
        if (hasExistingState && currentState != null)
        {
            Console.WriteLine($"[SignalR] JoinTable returning state: existing state with {currentState.Cards.Count} cards");
            return currentState;
        }

        // No existing state and this is the first client (count == 1) — they should randomize
        if (newCount == 1)
        {
            Console.WriteLine($"[SignalR] JoinTable returning state: no state (first client)");
            return null;
        }

        // No existing state but count > 1 — race condition: another client also just joined.
        // Wait briefly for the other client to store their state, then return it.
        Console.WriteLine($"[SignalR] Race condition detected: no state but {newCount} clients. Waiting for state...");
        for (int i = 0; i < 10; i++)
        {
            await Task.Delay(100);
            if (TableStates.TryGetValue(tableId, out TableState? waitedState))
            {
                Console.WriteLine($"[SignalR] JoinTable returning state: waited {i * 100}ms, found state with {waitedState.Cards.Count} cards");
                return waitedState;
            }
        }
        Console.WriteLine($"[SignalR] JoinTable returning state: timeout waiting for state, returning null");
        return null;
    }

    /// <summary>
    /// Called when a client leaves a table group.
    /// </summary>
    public async Task LeaveTable(string tableId)
    {
        var connectionId = Context.ConnectionId;
        Console.WriteLine($"[SignalR] LeaveTable: connection {connectionId} leaving table {tableId}");
        await Groups.RemoveFromGroupAsync(connectionId, tableId);
        
        // Remove this table from the connection's tracking
        if (ConnectionTables.TryGetValue(connectionId, out var tables))
        {
            tables.Remove(tableId);
            if (tables.Count == 0)
            {
                ConnectionTables.TryRemove(connectionId, out _);
            }
        }
        
        ActiveTables.AddOrUpdate(tableId, 0, (_, count) =>
        {
            int newCount = count - 1;
            if (newCount <= 0)
            {
                ActiveTables.TryRemove(tableId, out int _);
                // Clean up stored state when the last client leaves
                TableStates.TryRemove(tableId, out TableState? _);
                Console.WriteLine($"[SignalR] Last client left table {tableId}, state cleaned up");
                return 0;
            }
            return newCount;
        });
        await Clients.All.SendAsync("ClientLeftTable", tableId, connectionId);
    }

    /// <summary>
    /// Clean up table tracking when a connection is unexpectedly lost.
    /// Note: We do NOT clean up TableStates here, because a client may be auto-reconnecting
    /// and the state should be preserved. TableStates are only cleaned up on explicit LeaveTable.
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var connectionId = Context.ConnectionId;
        Console.WriteLine($"[SignalR] OnDisconnectedAsync: connection {connectionId} disconnected");
        
        // Only remove from the tables this connection actually joined
        if (ConnectionTables.TryRemove(connectionId, out HashSet<string>? tables))
        {
            foreach (var tableId in tables)
            {
                Console.WriteLine($"[SignalR] Removing connection {connectionId} from group {tableId}");
                await Groups.RemoveFromGroupAsync(connectionId, tableId);
                ActiveTables.AddOrUpdate(tableId, 0, (_, count) =>
                {
                    int newCount = count - 1;
                    if (newCount <= 0)
                    {
                        ActiveTables.TryRemove(tableId, out int _);
                        // Do NOT remove TableStates here — preserve state for reconnecting clients
                        Console.WriteLine($"[SignalR] Last client disconnected from table {tableId}, ActiveTables count cleared (state preserved for reconnect)");
                        return 0;
                    }
                    return newCount;
                });
            }
        }
        else
        {
            Console.WriteLine($"[SignalR] Connection {connectionId} had no tracked tables");
        }
        
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Broadcast table state to a specific table group (excluding the sender) and store it on the server.
    /// </summary>
    public async Task BroadcastTableStateToGroup(string tableId, TableState tableState)
    {
        tableState.TableId = tableId;
        tableState.Timestamp = DateTime.UtcNow;
        // Store the current state on the server so new clients can retrieve it
        TableStates.AddOrUpdate(tableId, tableState, (_, _) => tableState);
        await Clients.OthersInGroup(tableId).SendAsync("ReceiveTableState", tableState);
    }

    /// <summary>
    /// Update a card's full state, update the stored table state, and broadcast to its table group.
    /// </summary>
    public async Task UpdateCardState(string tableId, CardState cardState)
    {
        Console.WriteLine($"[SignalR] UpdateCardState called: tableId={tableId}, cardId={cardState.CardId}");
        if (TableStates.TryGetValue(tableId, out TableState? state))
        {
            var cardIndex = state.Cards.FindIndex(card => card.CardId == cardState.CardId);
            if (cardIndex >= 0)
            {
                state.Cards[cardIndex] = cardState;
            }
            else
            {
                state.Cards.Add(cardState);
            }
            state.Timestamp = DateTime.UtcNow;
        }

        await Clients.OthersInGroup(tableId).SendAsync("ReceiveCardStateUpdate", tableId, cardState);
    }

    /// <summary>
    /// Send a simple ping to test if the connection can receive messages.
    /// </summary>
    public async Task Ping()
    {
        await Clients.Caller.SendAsync("Pong", DateTime.UtcNow.ToString("O"));
    }

    /// <summary>
    /// Broadcast a message to all clients in a group for testing.
    /// </summary>
    public async Task BroadcastTest(string tableId, string message)
    {
        var senderConnectionId = Context.ConnectionId;
        Console.WriteLine($"[SignalR] BroadcastTest: tableId={tableId}, message={message}, sender={senderConnectionId}");
        
        var connectionsInTable = new List<string>();
        foreach (var kvp in ConnectionTables)
        {
            if (kvp.Value.Contains(tableId))
            {
                connectionsInTable.Add(kvp.Key);
            }
        }
        Console.WriteLine($"[SignalR] BroadcastTest: connections in table (custom): {string.Join(", ", connectionsInTable)}");
        
        // Send to ALL clients (not just group) to test if ANY broadcast works
        await Clients.All.SendAsync("BroadcastTestMessage", message, senderConnectionId);
        Console.WriteLine($"[SignalR] BroadcastTest: sent to All");
        
        // Send to others in group
        await Clients.OthersInGroup(tableId).SendAsync("BroadcastTestMessage", message, senderConnectionId);
        Console.WriteLine($"[SignalR] BroadcastTest: sent to OthersInGroup");
        
        // Also send to all in group
        await Clients.Group(tableId).SendAsync("BroadcastTestMessage", message, senderConnectionId);
        Console.WriteLine($"[SignalR] BroadcastTest: sent to Group (all)");
    }
}
