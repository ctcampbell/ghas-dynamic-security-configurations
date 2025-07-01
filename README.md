# GitHub Advanced Security Dynamic Configuration

This Azure Functions-based Probot application automatically updates repository security configurations based on GitHub custom property values, specifically the `business_criticality` property.

## Features

- Listens for `custom_property_values` webhook events
- Maps `business_criticality` custom property values to GitHub Advanced Security configurations
- Automatically applies the appropriate security configuration to repositories

## Setup

### 1. Create a GitHub App

Create a GitHub App with the following permissions:

- **Repository permissions:**
  - Metadata: Read-only
- **Organization permissions:**
  - Administration: Read and write (to update security configurations)
  - Custom properties: Read-only

- **Subscribe to events:**
  - Custom property values

Create a private key and store the resulting PEM file somewhere safe.

Make a note of the app ID, and install the app on your organisation.

> NOTE: Leave webhooks disabled for now.

### 2. Configure Security Configuration IDs

To find your security configuration IDs, use the GitHub REST API:

```bash
curl -H "Authorization: bearer YOUR_GITHUB_PAT" \
     -H "Accept: application/vnd.github+json" \
     https://api.github.com/orgs/YOUR_ORG/code-security/configurations
```

### 3. Deploy to Azure Functions

Deploy this application to Azure Functions with the following environment variables:

```
APP_ID="[Your GitHub app ID from step 1]"
PRIVATE_KEY="[Your PEM file contents, with newlines replaced with literal \n strings]"
WEBHOOK_SECRET="[some genuinely long and random text]"

# Security Configuration Mappings
HIGH_CRITICALITY_CONFIG_ID=123456
MEDIUM_CRITICALITY_CONFIG_ID=123457
LOW_CRITICALITY_CONFIG_ID=123458
CRITICAL_CRITICALITY_CONFIG_ID=123459
```

### 4. Update webhook settings in your GitHub app

Add the URL of the deployed Azure Function, which should look like `https://[Your function name].azurewebsites.net/api/azureprobot`, to your GitHub app, along with the webhook secret created earlier.

### 5. Set Up Custom Properties

In your GitHub organization, create a custom property named `business_criticality` with the following allowed values:
- `critical`
- `high`
- `medium`
- `low`

## How It Works

1. When a repository's `business_criticality` custom property is updated, GitHub sends a `custom_property_values` webhook event
2. The application extracts the new business criticality value
3. It maps the value to the corresponding security configuration ID using the environment variables
4. The application calls the GitHub API to attach the security configuration to the repository

## Supported Business Criticality Values

| Value | Environment Variable | Description |
|-------|---------------------|-------------|
| `critical` | `CRITICAL_CRITICALITY_CONFIG_ID` | Highest security requirements |
| `high` | `HIGH_CRITICALITY_CONFIG_ID` | High security requirements |
| `medium` | `MEDIUM_CRITICALITY_CONFIG_ID` | Standard security requirements |
| `low` | `LOW_CRITICALITY_CONFIG_ID` | Basic security requirements |

## Logs

The application provides detailed logging for:
- Webhook event reception
- Property value extraction
- Security configuration mapping
- API calls and responses
- Error handling

Check your Azure Functions logs for troubleshooting.
