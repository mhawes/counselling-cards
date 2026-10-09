using Microsoft.AspNetCore.SignalR;
using TableStateServer.Hubs;
using TableStateServer.Services;

var builder = WebApplication.CreateBuilder(args);

// Add SignalR services with detailed logging
builder.Services.AddSignalR();
builder.Services.AddHostedService<InactiveTableCleanupService>();
builder.Logging.AddConsole();
builder.Logging.SetMinimumLevel(LogLevel.Debug);

// Configure CORS to allow frontend connections
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:9000", "http://localhost:5271")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

var app = builder.Build();

// Use CORS
app.UseCors("AllowFrontend");

// Serve static files for test pages
app.UseStaticFiles();

// Map the SignalR hub
app.MapHub<TableStateHub>("/tableStateHub");

app.Run();
