using Microsoft.Extensions.Hosting;
using TableStateServer.Hubs;

namespace TableStateServer.Services;

public sealed class InactiveTableCleanupService : BackgroundService
{
    private static readonly TimeSpan CleanupInterval = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan TableLifetime = TimeSpan.FromHours(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(CleanupInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await TableStateHub.CleanupExpiredTablesAsync(TableLifetime, stoppingToken);
        }
    }
}
