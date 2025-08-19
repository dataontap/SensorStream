import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Brain, MapPin, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface LocationPrediction {
  id: string;
  deviceId: string;
  prediction: 'indoor' | 'outdoor';
  confidence: number;
  sensorDataSnapshot: any;
  timestamp: string;
  userConfirmation: 'correct' | 'incorrect' | null;
  actualLocation: 'indoor' | 'outdoor' | null;
  confirmedAt: string | null;
}

interface LocationAnalysis {
  prediction: 'indoor' | 'outdoor';
  confidence: number;
  reasoning: string;
}

interface PredictionResponse {
  prediction: LocationPrediction;
  analysis: LocationAnalysis;
}

interface LocationPredictorProps {
  deviceId: string;
  deviceName: string;
}

export function LocationPredictor({ deviceId, deviceName }: LocationPredictorProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [currentPrediction, setCurrentPrediction] = useState<LocationPrediction | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get prediction history
  const { data: predictions = [] } = useQuery<LocationPrediction[]>({
    queryKey: ['/api/devices', deviceId, 'predictions'],
    refetchInterval: 30000,
  });

  // Create new prediction
  const predictMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/devices/${deviceId}/predictions/analyze`);
      return await response.json() as PredictionResponse;
    },
    onSuccess: (response: PredictionResponse) => {
      setCurrentPrediction(response.prediction);
      setShowConfirmDialog(true);
      queryClient.invalidateQueries({ queryKey: ['/api/devices', deviceId, 'predictions'] });
      toast({
        title: '🤖 AI Analysis Complete',
        description: `Predicted: ${response.analysis.prediction} (${Math.round(response.analysis.confidence * 100)}% confidence)`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Analysis Failed',
        description: error.message || 'Unable to analyze sensor data',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsAnalyzing(false);
    },
  });

  // Confirm prediction
  const confirmMutation = useMutation({
    mutationFn: async ({ predictionId, isCorrect, actualLocation }: {
      predictionId: string;
      isCorrect: boolean;
      actualLocation: 'indoor' | 'outdoor';
    }) => {
      const response = await apiRequest('POST', `/api/predictions/${predictionId}/confirm`, { isCorrect, actualLocation });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/devices', deviceId, 'predictions'] });
      setShowConfirmDialog(false);
      setCurrentPrediction(null);
      toast({
        title: '✅ Feedback Recorded',
        description: 'Thank you! This helps improve future predictions.',
      });
    },
  });

  const handlePredict = () => {
    setIsAnalyzing(true);
    predictMutation.mutate();
  };

  const handleConfirm = (isCorrect: boolean, actualLocation: 'indoor' | 'outdoor') => {
    if (currentPrediction) {
      confirmMutation.mutate({
        predictionId: currentPrediction.id,
        isCorrect,
        actualLocation,
      });
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getLocationIcon = (location: 'indoor' | 'outdoor') => {
    return location === 'outdoor' ? '🌳' : '🏠';
  };

  return (
    <div className="space-y-4">
      <Card data-testid="location-predictor-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Location Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Use AI to predict if you're indoors or outdoors based on your sensor data
            </p>
            
            <Button 
              onClick={handlePredict}
              disabled={isAnalyzing || predictMutation.isPending}
              className="w-full"
              data-testid="button-predict-location"
            >
              {isAnalyzing || predictMutation.isPending ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Sensor Data...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Predict My Location
                </>
              )}
            </Button>

            {predictions && predictions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Recent Predictions
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {predictions.slice(0, 5).map((prediction: LocationPrediction) => (
                    <div 
                      key={prediction.id}
                      className="flex items-center justify-between p-2 bg-muted rounded-lg text-sm"
                      data-testid={`prediction-${prediction.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getLocationIcon(prediction.prediction)}</span>
                        <span className="font-medium capitalize">{prediction.prediction}</span>
                        <div className={`w-2 h-2 rounded-full ${getConfidenceColor(prediction.confidence)}`} />
                        <span className="text-muted-foreground">
                          {Math.round(prediction.confidence * 100)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {prediction.userConfirmation === 'correct' && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                        {prediction.userConfirmation === 'incorrect' && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(prediction.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent data-testid="prediction-confirmation-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Confirm Location Prediction
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              {currentPrediction && (
                <>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getLocationIcon(currentPrediction.prediction)}</span>
                      <div>
                        <p className="font-medium text-lg capitalize">
                          {currentPrediction.prediction}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getConfidenceColor(currentPrediction.confidence)}`} />
                          <span className="text-sm">
                            {Math.round(currentPrediction.confidence * 100)}% confidence
                          </span>
                        </div>
                      </div>
                    </div>
                    {currentPrediction.sensorDataSnapshot?.analysis?.reasoning && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {currentPrediction.sensorDataSnapshot.analysis.reasoning}
                      </p>
                    )}
                  </div>
                  <p className="font-medium">Is this prediction correct?</p>
                  <p className="text-sm">Your feedback helps the AI learn and improve future predictions.</p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => handleConfirm(true, currentPrediction?.prediction || 'indoor')}
                className="flex-1"
                data-testid="button-confirm-correct"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Correct
              </Button>
              <Button
                variant="outline"
                onClick={() => handleConfirm(false, currentPrediction?.prediction === 'indoor' ? 'outdoor' : 'indoor')}
                className="flex-1"
                data-testid="button-confirm-incorrect"
              >
                <XCircle className="mr-2 h-4 w-4" />
                Wrong
              </Button>
            </div>
            <AlertDialogCancel className="w-full sm:w-auto" data-testid="button-cancel-confirmation">
              Skip
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}