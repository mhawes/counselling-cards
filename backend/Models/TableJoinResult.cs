namespace TableStateServer.Models;

/// <summary>
/// Describes a table join and its current state, if one exists.
/// </summary>
public class TableJoinResult
{
    public string TableId { get; set; } = string.Empty;

    public string DeckId { get; set; } = string.Empty;

    public TableState? State { get; set; }
}
