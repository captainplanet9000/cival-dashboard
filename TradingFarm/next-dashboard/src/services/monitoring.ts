"use client";
// Stub monitoring service for deployment
export const initializeMonitoring = () => true;
export const recordMetric = () => {};
export const incrementCounter = () => {};
export const startTimer = () => () => {};
export const recordHistogram = () => {};
export default { initializeMonitoring, recordMetric, incrementCounter, startTimer, recordHistogram };
