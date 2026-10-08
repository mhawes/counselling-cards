namespace TableStateServer.Models;

/// <summary>
/// Represents the full state of the table, including all card positions.
/// </summary>
public class TableState
{
    /// <summary>
    /// Identifier for the table session.
    /// </summary>
    public string TableId { get; set; } = string.Empty;

    /// <summary>
    /// All card positions on the table.
    /// </summary>
    public List<CardState> Cards { get; set; } = new();

    /// <summary>
    /// Timestamp of when this state was created.
    /// </summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
