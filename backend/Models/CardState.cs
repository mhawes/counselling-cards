namespace TableStateServer.Models;

/// <summary>
/// Represents the complete state of a single card on the table.
/// </summary>
public class CardState
{
    /// <summary>
    /// Unique identifier for the card.
    /// </summary>
    public string CardId { get; set; } = string.Empty;

    /// <summary>
    /// X coordinate of the card on the table.
    /// </summary>
    public double X { get; set; }

    /// <summary>
    /// Y coordinate of the card on the table.
    /// </summary>
    public double Y { get; set; }

    /// <summary>
    /// Rotation angle of the card in degrees.
    /// </summary>
    public double Rotation { get; set; }

    /// <summary>
    /// Stacking order of the card on the table.
    /// </summary>
    public int ZIndex { get; set; }

    /// <summary>
    /// Whether the card is flipped to show its back.
    /// </summary>
    public bool Flipped { get; set; }
}
