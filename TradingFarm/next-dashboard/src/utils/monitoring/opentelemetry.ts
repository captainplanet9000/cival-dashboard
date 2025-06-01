/**
 * OpenTelemetry configuration for application monitoring
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';

// Instrumentation packages
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';

// Configuration variables
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const OTEL_EXPORTER_OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const SERVICE_NAME = 'trading-farm-dashboard';
const SERVICE_VERSION = process.env.npm_package_version || '1.0.0';

/**
 * Initialize OpenTelemetry instrumentation
 */
export function initializeMonitoring() {
  try {
    if (typeof window !== 'undefined') {
      // We're in the browser, don't initialize server monitoring
      return;
    }
    
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: SERVICE_NAME,
        [SemanticResourceAttributes.SERVICE_VERSION]: SERVICE_VERSION,
        environment: process.env.NODE_ENV || 'development',
      })
    );

    // Set up exporters
    const traceExporter = IS_PRODUCTION 
      ? new OTLPTraceExporter({
          url: `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
        }) 
      : new ConsoleSpanExporter();
      
    const metricExporter = new OTLPMetricExporter({
      url: `${OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`,
    });

    // Configure instrumentation
    const instrumentations = [
      new HttpInstrumentation(),
      new FetchInstrumentation(),
      new ExpressInstrumentation(),
    ];

    // Create the OpenTelemetry SDK
    const sdk = new NodeSDK({
      resource,
      traceExporter,
      metricExporter,
      spanProcessor: new BatchSpanProcessor(traceExporter),
      instrumentations,
    });

    // Start the SDK
    sdk.start();

    console.log('OpenTelemetry instrumentation initialized');

    // Graceful shutdown
    const shutdownMonitoring = () => {
      sdk.shutdown()
        .then(() => console.log('OpenTelemetry SDK shut down'))
        .catch((error) => console.error('Error shutting down OpenTelemetry SDK', error))
        .finally(() => process.exit(0));
    };

    // Register shutdown handlers
    process.on('SIGTERM', shutdownMonitoring);
    process.on('SIGINT', shutdownMonitoring);
    
    return sdk;
  } catch (error) {
    console.error('Failed to initialize OpenTelemetry instrumentation:', error);
  }
}

export default initializeMonitoring;
