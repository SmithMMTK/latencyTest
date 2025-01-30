using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;

class Program
{
    // Class to represent the JSON structure
    public class Target
    {
        public string Title { get; set; }
        public string ServerIp { get; set; }
        public string Color { get; set; }
    }

    public class Parameters
    {
        public List<Target> Targets { get; set; }
    }

    static async Task Main(string[] args)
    {
        // Path to the parameters.json file
        string filePath = "parameters.json";

        try
        {
            // Read the JSON file
            string jsonContent = await File.ReadAllTextAsync(filePath);


            // Deserialize JSON into objects
            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };
            var parameters = JsonSerializer.Deserialize<Parameters>(jsonContent, options);

            Console.WriteLine($"JSON Content:\n{jsonContent}");
            Console.WriteLine("--------------------------");
            Console.WriteLine($"parsed JSON:\n{parameters}");

            if (parameters != null && parameters.Targets != null)
            {
                // Loop through the targets and display the information
                foreach (var target in parameters.Targets)
                {
                    Console.WriteLine($"Title: {target.Title}");
                    Console.WriteLine($"Server IP: {target.ServerIp}");
                    Console.WriteLine($"Color: {target.Color}");
                    Console.WriteLine("--------------------------");
                }
            }
            else
            {
                Console.WriteLine("No targets found in the JSON file.");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error reading or parsing the JSON file: {ex.Message}");
        }
    }
}