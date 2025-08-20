import { GoogleGenAI } from "@google/genai";
import type { SensorReading, LocationPrediction } from "@shared/schema";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface LocationAnalysis {
  prediction: 'indoor' | 'outdoor';
  confidence: number; // 0-1
  reasoning: string;
}

export async function analyzeLocationFromSensorData(
  recentReadings: SensorReading[],
  historicalPredictions: LocationPrediction[] = []
): Promise<LocationAnalysis> {
  try {
    // Prepare sensor data summary
    const sensorSummary = summarizeSensorData(recentReadings);
    
    // Prepare learning context from historical confirmations
    const learningContext = buildLearningContext(historicalPredictions);
    
    const systemPrompt = `You are an AI that predicts whether someone is indoors or outdoors based on mobile device sensor data.

Key indicators to consider:
- Light Level: Higher values typically indicate outdoor environments
- Air Pressure: Can indicate altitude changes (outdoor movement)
- Accelerometer: Movement patterns differ between indoor/outdoor activities
- Magnetometer: Magnetic field variations can indicate environment changes
- Orientation: Device orientation patterns may vary by location

${learningContext}

Analyze the sensor data and predict indoor vs outdoor with confidence level (0-1).
Respond with JSON in this format:
{
  "prediction": "indoor" or "outdoor",
  "confidence": number between 0 and 1,
  "reasoning": "brief explanation of key factors"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            prediction: { type: "string", enum: ["indoor", "outdoor"] },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            reasoning: { type: "string" }
          },
          required: ["prediction", "confidence", "reasoning"]
        }
      },
      contents: `Recent sensor data summary:\n${sensorSummary}`
    });

    const rawJson = response.text;
    if (!rawJson) {
      throw new Error("Empty response from Gemini");
    }

    const result: LocationAnalysis = JSON.parse(rawJson);
    
    // Validate the response
    if (!result.prediction || !['indoor', 'outdoor'].includes(result.prediction)) {
      throw new Error("Invalid prediction value");
    }
    
    if (typeof result.confidence !== 'number' || result.confidence < 0 || result.confidence > 1) {
      throw new Error("Invalid confidence value");
    }

    return result;
    
  } catch (error) {
    console.error('Error analyzing location:', error);
    // Return a fallback response
    return {
      prediction: 'indoor',
      confidence: 0.1,
      reasoning: 'Unable to analyze sensor data reliably'
    };
  }
}

function summarizeSensorData(readings: SensorReading[]): string {
  if (readings.length === 0) {
    return "No sensor data available";
  }

  // Calculate averages and patterns
  const validReadings = readings.filter(r => r.timestamp);
  
  const avgLight = validReadings
    .filter(r => r.lightLevel !== null)
    .reduce((sum, r) => sum + (r.lightLevel || 0), 0) / validReadings.length || 0;
    
  const pressureReadings = validReadings
    .filter(r => r.airPressure !== null)
    .map(r => r.airPressure!)
    .slice(-10); // Last 10 readings
  
  const currentPressure = pressureReadings[pressureReadings.length - 1] || 0;
  const minPressure = pressureReadings.length > 0 ? Math.min(...pressureReadings) : 0;
  const maxPressure = pressureReadings.length > 0 ? Math.max(...pressureReadings) : 0;

  // Accelerometer movement intensity
  const movementIntensity = validReadings
    .filter(r => r.accelerometer)
    .map(r => {
      const acc = r.accelerometer as {x: number, y: number, z: number};
      return Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
    })
    .reduce((sum, intensity) => sum + intensity, 0) / validReadings.length || 0;

  // Time span
  const timeSpan = validReadings.length > 1 ? 
    new Date(validReadings[validReadings.length - 1].timestamp!).getTime() - 
    new Date(validReadings[0].timestamp!).getTime() : 0;

  return `
Sensor Data Analysis (${validReadings.length} readings over ${Math.round(timeSpan / 1000)} seconds):
- Average Light Level: ${avgLight.toFixed(2)} lux
- Current Air Pressure: ${currentPressure.toFixed(2)} hPa
- Pressure Range: ${minPressure.toFixed(2)} - ${maxPressure.toFixed(2)} hPa
- Recent Pressure Values: ${pressureReadings.slice(-5).map(p => p.toFixed(2)).join(', ')} hPa
- Movement Intensity: ${movementIntensity.toFixed(2)} m/s²
- Time of analysis: ${new Date().toLocaleTimeString()}
- Device activity: ${movementIntensity > 5 ? 'High movement' : movementIntensity > 2 ? 'Moderate movement' : 'Low movement'}
  `;
}

function buildLearningContext(historicalPredictions: LocationPrediction[]): string {
  const confirmedPredictions = historicalPredictions.filter(p => 
    p.userConfirmation === 'correct' && p.actualLocation
  );

  if (confirmedPredictions.length === 0) {
    return "No historical learning data available yet.";
  }

  const indoorCorrect = confirmedPredictions.filter(p => p.actualLocation === 'indoor').length;
  const outdoorCorrect = confirmedPredictions.filter(p => p.actualLocation === 'outdoor').length;

  return `
Learning Context (based on ${confirmedPredictions.length} confirmed predictions):
- Confirmed Indoor: ${indoorCorrect} cases
- Confirmed Outdoor: ${outdoorCorrect} cases
- Use this historical data to improve accuracy for similar sensor patterns
  `;
}