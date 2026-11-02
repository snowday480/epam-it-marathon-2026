using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace APIHandler.Models.GuestSessions;

public class SubmitGroupPreOrderRequest
{
    [Required]
    [JsonPropertyName("reservationId")]
    public required string ReservationId { get; set; }
}
