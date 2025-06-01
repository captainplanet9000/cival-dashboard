/**
 * ML Models Management Page
 */
"use client";

import { useEffect, useState } from "react";
import { ModelDefinition } from "@/services/ml/model-service";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, ArrowRight, PlusCircle, Brain, BarChart4, LineChart, Activity, Zap } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMlModels } from "@/hooks/use-ml-models";
import Link from "next/link";
import ModelCreationDialog from "@/components/ml/model-creation-dialog";
import ModelCard from "@/components/ml/model-card";
import ModelDetailView from "@/components/ml/model-detail-view";
import ModelPredictionForm from '@/components/ml/ModelPredictionForm';
import ModelTrainingForm from '@/components/ml/ModelTrainingForm';

export default function MLDashboardPage() {
  const { models, loading, error, refreshModels } = useMlModels();
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [modelType, setModelType] = useState<string | null>(null);

  const selectedModel = selectedModelId 
    ? models.find(m => m.id === selectedModelId) 
    : null;

  // Modal states for prediction and training
  const [showPredictionModal, setShowPredictionModal] = useState(false);
  const [showTrainingModal, setShowTrainingModal] = useState(false);

  // Filter models by type for tabs
  const classificationModels = models.filter(m => m.type === 'classification');
  const regressionModels = models.filter(m => m.type === 'regression');
  const timeSeriesModels = models.filter(m => m.type === 'time-series');
  const reinforcementModels = models.filter(m => m.type === 'reinforcement');

  // Group models by status
  const readyModels = models.filter(m => m.status === 'ready');
  const trainingModels = models.filter(m => m.status === 'training');
  const errorModels = models.filter(m => m.status === 'error');

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Machine Learning Models</h1>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="flex items-center gap-2"
        >
          <PlusCircle size={16} />
          Create New Model
        </Button>
      </div>

      {/* Action buttons for selected model */}
      {selectedModel && (
        <div className="flex gap-2 mb-4">
          <Button variant="outline" onClick={() => setShowPredictionModal(true)}>
            Run Prediction
          </Button>
          <Button variant="outline" onClick={() => setShowTrainingModal(true)}>
            Train Model
          </Button>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Model Prediction/Training Modals */}
      {selectedModelId && (
        <>
          <ModelPredictionForm
            open={showPredictionModal}
            onOpenChange={setShowPredictionModal}
            modelId={String(selectedModelId)}
          />
          <ModelTrainingForm
            open={showTrainingModal}
            onOpenChange={setShowTrainingModal}
            modelId={String(selectedModelId)}
          />
        </>
      )}

      {/* Status overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2">
              <Brain size={20} className="text-primary" />
              Total Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? <Skeleton className="h-10 w-16" /> : models.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2">
              <CheckCircle size={20} className="text-green-500" />
              Ready for Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? <Skeleton className="h-10 w-16" /> : readyModels.length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2">
              <Activity size={20} className="text-blue-500" />
              Training in Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {loading ? <Skeleton className="h-10 w-16" /> : trainingModels.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Models listing */}
      <div className="grid grid-cols-1 gap-6">
        {selectedModel ? (
          <ModelDetailView 
            model={selectedModel} 
            onBack={() => setSelectedModelId(null)}
            onRefresh={refreshModels}
          />
        ) : (
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Models</TabsTrigger>
              <TabsTrigger value="classification">Classification</TabsTrigger>
              <TabsTrigger value="regression">Regression</TabsTrigger>
              <TabsTrigger value="time-series">Time Series</TabsTrigger>
              <TabsTrigger value="reinforcement">Reinforcement</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="space-y-4">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-24 w-full" />
                      </CardContent>
                      <CardFooter>
                        <Skeleton className="h-10 w-full" />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : models.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>No Models Found</CardTitle>
                    <CardDescription>Create your first machine learning model to get started</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center py-6">
                    <Button onClick={() => setShowCreateDialog(true)}>
                      Create New Model
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {models.map(model => (
                    <ModelCard 
                      key={model.id} 
                      model={model} 
                      onClick={() => setSelectedModelId(model.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="classification" className="space-y-4">
              {!loading && classificationModels.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>No Classification Models</CardTitle>
                    <CardDescription>Create a new classification model to get started</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center py-6">
                    <Button 
                      onClick={() => {
                        setModelType('classification');
                        setShowCreateDialog(true);
                      }}
                    >
                      Create Classification Model
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classificationModels.map(model => (
                    <ModelCard 
                      key={model.id} 
                      model={model} 
                      onClick={() => setSelectedModelId(model.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="regression" className="space-y-4">
              {!loading && regressionModels.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>No Regression Models</CardTitle>
                    <CardDescription>Create a new regression model to get started</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center py-6">
                    <Button 
                      onClick={() => {
                        setModelType('regression');
                        setShowCreateDialog(true);
                      }}
                    >
                      Create Regression Model
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {regressionModels.map(model => (
                    <ModelCard 
                      key={model.id} 
                      model={model} 
                      onClick={() => setSelectedModelId(model.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="time-series" className="space-y-4">
              {!loading && timeSeriesModels.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>No Time Series Models</CardTitle>
                    <CardDescription>Create a new time series model to get started</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center py-6">
                    <Button 
                      onClick={() => {
                        setModelType('time-series');
                        setShowCreateDialog(true);
                      }}
                    >
                      Create Time Series Model
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {timeSeriesModels.map(model => (
                    <ModelCard 
                      key={model.id} 
                      model={model} 
                      onClick={() => setSelectedModelId(model.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="reinforcement" className="space-y-4">
              {!loading && reinforcementModels.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle>No Reinforcement Learning Models</CardTitle>
                    <CardDescription>Create a new reinforcement learning model to get started</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center py-6">
                    <Button 
                      onClick={() => {
                        setModelType('reinforcement');
                        setShowCreateDialog(true);
                      }}
                    >
                      Create Reinforcement Learning Model
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reinforcementModels.map(model => (
                    <ModelCard 
                      key={model.id} 
                      model={model} 
                      onClick={() => setSelectedModelId(model.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Create model dialog */}
      <ModelCreationDialog
        open={showCreateDialog}
        initialType={modelType}
        onOpenChange={setShowCreateDialog}
        onModelCreated={(model) => {
          refreshModels();
          setSelectedModelId(model.id);
        }}
      />
    </div>
  );
}
