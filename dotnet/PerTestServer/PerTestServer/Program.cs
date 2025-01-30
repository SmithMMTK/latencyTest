var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/", () => "Performance Server is running! call /ping to check if it's up");


app.MapGet("/ping", () => 
{
    var response = new { message = "pong" };
    return Results.Json(response);
});

//make sure to change the port to 5100 to access the server from localhost and external Public IP
app.Run("http://0.0.0.0:5100");