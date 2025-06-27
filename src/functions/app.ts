import { Probot } from "probot";
import * as process from "process";

// Mapping of business criticality values to security configuration IDs
const SECURITY_CONFIG_MAPPING: Record<string, number> = {
  "high": parseInt(process.env.HIGH_CRITICALITY_CONFIG_ID || "0"),
  "medium": parseInt(process.env.MEDIUM_CRITICALITY_CONFIG_ID || "0"),
  "low": parseInt(process.env.LOW_CRITICALITY_CONFIG_ID || "0"),
  "critical": parseInt(process.env.CRITICAL_CRITICALITY_CONFIG_ID || "0")
};

interface CustomPropertyValue {
  property_name: string;
  value: string | null;
}

interface CustomPropertyValuesPayload {
  action: string;
  repository: {
    id: number;
    full_name: string;
    owner: {
      login: string;
    };
    name: string;
  };
  old_custom_property_values?: CustomPropertyValue[];
  new_custom_property_values?: CustomPropertyValue[];
}

export = (app: Probot) => {
  // Handle custom property values webhook event using webhooks.on for custom events
  app.webhooks.on("custom_property_values", async (context) => {
    const payload = context.payload as CustomPropertyValuesPayload;
    
    app.log.info("Received custom_property_values event", {
      action: payload.action,
      repository: payload.repository.full_name
    });

    try {
      // Find the business_criticality property in the new values
      const businessCriticalityProperty = payload.new_custom_property_values?.find(
        prop => prop.property_name === "business_criticality"
      );

      if (!businessCriticalityProperty || !businessCriticalityProperty.value) {
        app.log.info("No business_criticality property found or value is null", {
          repository: payload.repository.full_name
        });
        return;
      }

      const criticalityLevel = businessCriticalityProperty.value.toLowerCase();
      const securityConfigId = SECURITY_CONFIG_MAPPING[criticalityLevel];

      if (!securityConfigId) {
        app.log.warn("No security configuration mapped for criticality level", {
          criticalityLevel,
          repository: payload.repository.full_name,
          availableMappings: Object.keys(SECURITY_CONFIG_MAPPING)
        });
        return;
      }

      app.log.info("Updating repository security configuration", {
        repository: payload.repository.full_name,
        criticalityLevel,
        securityConfigId
      });

      // Update the repository's security configuration
      await context.octokit.rest.codeSecurity.attachConfiguration({
        org: payload.repository.owner.login,
        configuration_id: securityConfigId,
        scope: "selected",
        selected_repository_ids: [payload.repository.id]
      });

      app.log.info("Successfully updated repository security configuration", {
        repository: payload.repository.full_name,
        criticalityLevel,
        securityConfigId
      });

    } catch (error) {
      app.log.error("Failed to update security configuration", {
        repository: payload.repository.full_name,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Don't throw the error to avoid webhook delivery failures
      // GitHub will retry on 5xx responses
    }
  });

  app.log.info("GitHub Advanced Security Dynamic Configuration app loaded", {
    mappedCriticalities: Object.keys(SECURITY_CONFIG_MAPPING),
    configuredMappings: Object.entries(SECURITY_CONFIG_MAPPING)
      .filter(([, id]) => id > 0)
      .map(([level]) => level)
  });
}