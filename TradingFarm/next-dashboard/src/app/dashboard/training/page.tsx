"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ShieldCheck, BookOpen, LineChart, Brain, Smartphone, FileText, 
  GraduationCap, CheckCircle2, PlayCircle, Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  duration: string;
  icon: React.ReactNode;
  progress: number;
  level: "beginner" | "intermediate" | "advanced";
  path: string;
  tag?: string;
}

export default function TrainingCenter() {
  const trainingModules: TrainingModule[] = [
    {
      id: "risk-management",
      title: "Risk Management Fundamentals",
      description: "Learn how to configure risk profiles, monitor positions, and implement risk controls",
      duration: "30 min",
      icon: <ShieldCheck className="h-8 w-8 text-blue-500" />,
      progress: 0,
      level: "intermediate",
      path: "/dashboard/training/risk-management",
      tag: "NEW"
    },
    {
      id: "ai-trading",
      title: "AI-Powered Trading",
      description: "Master AI predictions, sentiment analysis, and automated trading signals",
      duration: "45 min",
      icon: <Brain className="h-8 w-8 text-purple-500" />,
      progress: 0,
      level: "advanced",
      path: "/dashboard/training/ai-trading",
      tag: "NEW"
    },
    {
      id: "mobile-trading",
      title: "Mobile & Cross-Platform Trading",
      description: "Trade effectively on any device with responsive interfaces and offline capabilities",
      duration: "20 min",
      icon: <Smartphone className="h-8 w-8 text-green-500" />,
      progress: 0,
      level: "beginner",
      path: "/dashboard/training/mobile-trading",
      tag: "NEW"
    },
    {
      id: "portfolio-analytics",
      title: "Advanced Portfolio Analytics",
      description: "Learn to track performance, generate reports, and compare against benchmarks",
      duration: "35 min",
      icon: <LineChart className="h-8 w-8 text-amber-500" />,
      progress: 0,
      level: "intermediate",
      path: "/dashboard/training/portfolio-analytics",
      tag: "NEW"
    },
    {
      id: "trading-terminal",
      title: "Trading Terminal Mastery",
      description: "Learn advanced order types, chart analysis, and efficient trade execution",
      duration: "40 min",
      icon: <GraduationCap className="h-8 w-8 text-red-500" />,
      progress: 80,
      level: "intermediate",
      path: "/dashboard/training/trading-terminal"
    },
    {
      id: "exchange-integration",
      title: "Exchange Integration",
      description: "Connect and manage multiple exchange accounts securely",
      duration: "25 min",
      icon: <CheckCircle2 className="h-8 w-8 text-green-500" />,
      progress: 100,
      level: "beginner",
      path: "/dashboard/training/exchange-integration"
    }
  ];

  const completedModules = trainingModules.filter(m => m.progress === 100).length;
  const totalProgress = Math.round((completedModules / trainingModules.length) * 100);

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Training Center</h1>
        <p className="text-muted-foreground mt-1">
          Interactive tutorials to help you master the Trading Farm platform
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Your Training Progress</CardTitle>
              <CardDescription>Complete all modules to become a Trading Farm expert</CardDescription>
            </div>
            <div className="text-2xl font-bold">
              {completedModules}/{trainingModules.length}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{totalProgress}%</span>
            </div>
            <Progress value={totalProgress} className="h-2" />
          </div>
          {completedModules === trainingModules.length ? (
            <div className="mt-4 flex items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
              <Award className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-green-700 dark:text-green-300 font-medium">
                Congratulations! You've completed all training modules
              </span>
            </div>
          ) : (
            <div className="mt-4 text-center">
              <span className="text-sm text-muted-foreground">
                {trainingModules.length - completedModules} modules remaining to complete your training
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Modules</TabsTrigger>
          <TabsTrigger value="beginner">Beginner</TabsTrigger>
          <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainingModules.map((module) => (
              <Card key={module.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      {module.icon}
                      <div>
                        <CardTitle className="text-lg flex items-center">
                          {module.title}
                          {module.tag && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                              {module.tag}
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription>{module.level}</CardDescription>
                      </div>
                    </div>
                    <div className="text-sm font-medium">{module.duration}</div>
                  </div>
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="text-sm text-muted-foreground mb-4">{module.description}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Completion</span>
                      <span>{module.progress}%</span>
                    </div>
                    <Progress value={module.progress} className="h-1.5" />
                  </div>
                </CardContent>
                <div className="px-6 pb-4">
                  <Link href={module.path}>
                    <Button variant={module.progress === 100 ? "outline" : "default"} className="w-full">
                      <PlayCircle className="mr-2 h-4 w-4" />
                      {module.progress === 100 ? "Review Module" : "Start Learning"}
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="beginner" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainingModules
              .filter((module) => module.level === "beginner")
              .map((module) => (
                <Card key={module.id} className="overflow-hidden">
                  {/* Same card content as above */}
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-4">
                        {module.icon}
                        <div>
                          <CardTitle className="text-lg flex items-center">
                            {module.title}
                            {module.tag && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                                {module.tag}
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription>{module.level}</CardDescription>
                        </div>
                      </div>
                      <div className="text-sm font-medium">{module.duration}</div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground mb-4">{module.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Completion</span>
                        <span>{module.progress}%</span>
                      </div>
                      <Progress value={module.progress} className="h-1.5" />
                    </div>
                  </CardContent>
                  <div className="px-6 pb-4">
                    <Link href={module.path}>
                      <Button variant={module.progress === 100 ? "outline" : "default"} className="w-full">
                        <PlayCircle className="mr-2 h-4 w-4" />
                        {module.progress === 100 ? "Review Module" : "Start Learning"}
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* Similar TabsContent for intermediate, advanced, and completed */}
        <TabsContent value="intermediate" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainingModules
              .filter((module) => module.level === "intermediate")
              .map((module) => (
                <Card key={module.id} className="overflow-hidden">
                  {/* Same card content structure */}
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-4">
                        {module.icon}
                        <div>
                          <CardTitle className="text-lg flex items-center">
                            {module.title}
                            {module.tag && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                                {module.tag}
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription>{module.level}</CardDescription>
                        </div>
                      </div>
                      <div className="text-sm font-medium">{module.duration}</div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground mb-4">{module.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Completion</span>
                        <span>{module.progress}%</span>
                      </div>
                      <Progress value={module.progress} className="h-1.5" />
                    </div>
                  </CardContent>
                  <div className="px-6 pb-4">
                    <Link href={module.path}>
                      <Button variant={module.progress === 100 ? "outline" : "default"} className="w-full">
                        <PlayCircle className="mr-2 h-4 w-4" />
                        {module.progress === 100 ? "Review Module" : "Start Learning"}
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainingModules
              .filter((module) => module.level === "advanced")
              .map((module) => (
                <Card key={module.id} className="overflow-hidden">
                  {/* Same card content structure */}
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-4">
                        {module.icon}
                        <div>
                          <CardTitle className="text-lg flex items-center">
                            {module.title}
                            {module.tag && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                                {module.tag}
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription>{module.level}</CardDescription>
                        </div>
                      </div>
                      <div className="text-sm font-medium">{module.duration}</div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground mb-4">{module.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Completion</span>
                        <span>{module.progress}%</span>
                      </div>
                      <Progress value={module.progress} className="h-1.5" />
                    </div>
                  </CardContent>
                  <div className="px-6 pb-4">
                    <Link href={module.path}>
                      <Button variant={module.progress === 100 ? "outline" : "default"} className="w-full">
                        <PlayCircle className="mr-2 h-4 w-4" />
                        {module.progress === 100 ? "Review Module" : "Start Learning"}
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainingModules
              .filter((module) => module.progress === 100)
              .map((module) => (
                <Card key={module.id} className="overflow-hidden">
                  {/* Same card content structure */}
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-4">
                        {module.icon}
                        <div>
                          <CardTitle className="text-lg flex items-center">
                            {module.title}
                            {module.tag && (
                              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                                {module.tag}
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription>{module.level}</CardDescription>
                        </div>
                      </div>
                      <div className="text-sm font-medium">{module.duration}</div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-3">
                    <p className="text-sm text-muted-foreground mb-4">{module.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Completion</span>
                        <span>{module.progress}%</span>
                      </div>
                      <Progress value={module.progress} className="h-1.5" />
                    </div>
                  </CardContent>
                  <div className="px-6 pb-4">
                    <Link href={module.path}>
                      <Button variant="outline" className="w-full">
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Review Module
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
