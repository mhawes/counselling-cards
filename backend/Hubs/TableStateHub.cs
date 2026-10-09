using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Security.Cryptography;
using Microsoft.AspNetCore.SignalR;
using TableStateServer.Models;

namespace TableStateServer.Hubs;

/// <summary>
/// SignalR hub for broadcasting table state between clients.
/// Clients create and join coded tables, then share card state with other table members.
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
    /// Maps each generated join code to the deck used by that table.
    /// </summary>
    private static readonly ConcurrentDictionary<string, string> TableDecks = new();

    private static readonly ConcurrentDictionary<string, DateTime> TableCreatedAt = new();

    private static readonly ConcurrentDictionary<string, SemaphoreSlim> TableLocks = new();

    private const string JoinCodeCharacters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

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
    /// Creates a table for the selected deck and returns its unique join code.
    /// </summary>
    public string CreateTable(string deckId)
    {
        if (string.IsNullOrWhiteSpace(deckId))
        {
            throw new HubException("A deck must be selected to create a table.");
        }

        string tableId;
        do
        {
            tableId = GenerateJoinCode();
        }
        while (!TableDecks.TryAdd(tableId, deckId));

        TableCreatedAt[tableId] = DateTime.UtcNow;
        Console.WriteLine($"[SignalR] Created table {tableId} for deck {deckId}");
        return tableId;
    }

    /// <summary>
    /// Joins a table by its code and returns its deck and current state, if one exists.
    /// </summary>
    public async Task<TableJoinResult> JoinTable(string joinCode)
    {
        var tableId = NormalizeJoinCode(joinCode);
        var connectionId = Context.ConnectionId;
        var tableLock = GetTableLock(tableId);
        await tableLock.WaitAsync();
        string deckId;
        bool hasExistingState;
        TableState? currentState;
        int newCount;
        try
        {
            if (!TableDecks.TryGetValue(tableId, out var foundDeckId))
            {
                throw new HubException("That join code was not found.");
            }
            deckId = foundDeckId;

            Console.WriteLine($"[SignalR] JoinTable: connection {connectionId} joining table {tableId}");
            hasExistingState = TableStates.TryGetValue(tableId, out currentState);

            await Groups.AddToGroupAsync(connectionId, tableId);

            ConnectionTables.AddOrUpdate(connectionId,
                new HashSet<string> { tableId },
                (_, tables) => { tables.Add(tableId); return tables; });

            newCount = ActiveTables.AddOrUpdate(tableId, 1, (_, count) => count + 1);
        }
        finally
        {
            tableLock.Release();
        }

        Console.WriteLine($"[SignalR] ActiveTables count for {tableId}: {newCount}");
        Console.WriteLine($"[SignalR] Connection {connectionId} tables: {string.Join(", ", ConnectionTables[connectionId])}");

        await Clients.All.SendAsync("ClientJoinedTable", tableId, connectionId);

        if (hasExistingState && currentState != null)
        {
            Console.WriteLine($"[SignalR] JoinTable returning state: existing state with {currentState.Cards.Count} cards");
            return new TableJoinResult { TableId = tableId, DeckId = deckId, State = currentState };
        }

        if (newCount == 1)
        {
            Console.WriteLine($"[SignalR] JoinTable returning state: no state (first client)");
            return new TableJoinResult { TableId = tableId, DeckId = deckId };
        }

        Console.WriteLine($"[SignalR] Race condition detected: no state but {newCount} clients. Waiting for state...");
        for (int i = 0; i < 10; i++)
        {
            await Task.Delay(100);
            if (TableStates.TryGetValue(tableId, out TableState? waitedState))
            {
                Console.WriteLine($"[SignalR] JoinTable returning state: waited {i * 100}ms, found state with {waitedState.Cards.Count} cards");
                return new TableJoinResult { TableId = tableId, DeckId = deckId, State = waitedState };
            }
        }
        Console.WriteLine($"[SignalR] JoinTable returning state: timeout waiting for state, returning null");
        return new TableJoinResult { TableId = tableId, DeckId = deckId };
    }

    private static SemaphoreSlim GetTableLock(string tableId)
    {
        return TableLocks.GetOrAdd(tableId, _ => new SemaphoreSlim(1, 1));
    }

    /// <summary>
    /// Removes tables that are at least the specified age and have no active connections.
    /// </summary>
    public static async Task CleanupExpiredTablesAsync(TimeSpan maxAge, CancellationToken cancellationToken)
    {
        var expirationTime = DateTime.UtcNow - maxAge;
        foreach (var (tableId, createdAt) in TableCreatedAt)
        {
            if (createdAt > expirationTime)
            {
                continue;
            }

            var tableLock = GetTableLock(tableId);
            await tableLock.WaitAsync(cancellationToken);
            try
            {
                if (!TableCreatedAt.TryGetValue(tableId, out var currentCreatedAt) ||
                    currentCreatedAt > expirationTime ||
                    ActiveTables.GetValueOrDefault(tableId) > 0)
                {
                    continue;
                }

                TableStates.TryRemove(tableId, out _);
                TableDecks.TryRemove(tableId, out _);
                TableCreatedAt.TryRemove(tableId, out _);
                ActiveTables.TryRemove(tableId, out _);
                Console.WriteLine($"[SignalR] Removed expired table {tableId}");
            }
            finally
            {
                tableLock.Release();
            }
        }
    }

    private static string GenerateJoinCode()
    {
        return new string(Enumerable.Range(0, 5)
            .Select(_ => JoinCodeCharacters[RandomNumberGenerator.GetInt32(JoinCodeCharacters.Length)])
            .ToArray());
    }

    private static string NormalizeJoinCode(string joinCode)
    {
        var normalized = joinCode?.Trim().ToUpperInvariant() ?? string.Empty;
        if (normalized.Length != 5 || normalized.Any(character => !JoinCodeCharacters.Contains(character)))
        {
            throw new HubException("Join codes must be five letters.");
        }

        return normalized;
    }

    /// <summary>
    /// Called when a client leaves a table group.
    /// </summary>
    public async Task LeaveTable(string tableId)
    {
        var connectionId = Context.ConnectionId;
        Console.WriteLine($"[SignalR] LeaveTable: connection {connectionId} leaving table {tableId}");
        var tableLock = GetTableLock(tableId);
        await tableLock.WaitAsync();
        try
        {
            await Groups.RemoveFromGroupAsync(connectionId, tableId);

            if (ConnectionTables.TryGetValue(connectionId, out var tables))
            {
                var wasTracked = tables.Remove(tableId);
                if (tables.Count == 0)
                {
                    ConnectionTables.TryRemove(connectionId, out _);
                }
                if (wasTracked)
                {
                    DecrementActiveConnectionCount(tableId);
                }
            }
        }
        finally
        {
            tableLock.Release();
        }

        await Clients.All.SendAsync("ClientLeftTable", tableId, connectionId);
    }

    private static void DecrementActiveConnectionCount(string tableId)
    {
        ActiveTables.AddOrUpdate(tableId, 0, (_, count) => Math.Max(0, count - 1));
    }

    /// <summary>
    /// Clean up table tracking when a connection is unexpectedly lost.
    /// Preserve the table state on disconnect so clients can reconnect until the table expires.
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
                var tableLock = GetTableLock(tableId);
                await tableLock.WaitAsync();
                try
                {
                    Console.WriteLine($"[SignalR] Removing connection {connectionId} from group {tableId}");
                    await Groups.RemoveFromGroupAsync(connectionId, tableId);
                    DecrementActiveConnectionCount(tableId);
                }
                finally
                {
                    tableLock.Release();
                }
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
