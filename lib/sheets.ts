import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;
const PROJECT_NUMBER = process.env.GOOGLE_CLOUD_PROJECT_NUMBER!;
const SERVICE_ACCOUNT = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;

async function getAuthClient() {
  // Local dev: use service account key JSON stored in env
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials: key,
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });
    return auth.getClient();
  }

  // Production (Vercel): Workload Identity Federation
  const { ExternalAccountClient } = await import("google-auth-library");
  const poolPath = `projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/vercel-pool/providers/vercel-provider`;
  const client = await ExternalAccountClient.fromJSON({
    type: "external_account",
    audience: `//iam.googleapis.com/${poolPath}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:id_token",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${SERVICE_ACCOUNT}:generateAccessToken`,
    subject_token_supplier: {
      getSubjectToken: async () => {
        const tokenRes = await fetch(
          `https://oidc.vercel.com/api/v1/token?audience=//iam.googleapis.com/${poolPath}`,
          {
            headers: {
              Authorization: `Bearer ${process.env.VERCEL_OIDC_TOKEN}`,
            },
          }
        );
        const tokenData = await tokenRes.json();
        return tokenData.value;
      },
    },
  } as never);
  return client;
}

export async function getAllSheetData(): Promise<Record<string, string[][]>> {
  const ranges = [
    "Net Worth!A1:Z120",
    "Equities!A1:Z200",
    "Portfolio Allocation!A1:Z60",
    "Dashboard!A1:Z50",
    "Crypto & Gold!A1:Z30",
    "Bonds!A1:Z25",
    "Cash!A1:Z10",
    "CPF!A1:Z70",
    "Liabilities!A1:Z25",
  ];

  try {
    const authClient = await getAuthClient();
    const sheets = google.sheets({ version: "v4", auth: authClient as never });
    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: SHEET_ID,
      ranges,
    });

    const result: Record<string, string[][]> = {};
    response.data.valueRanges?.forEach((vr, i) => {
      const sheetName = ranges[i].split("!")[0];
      result[sheetName] = (vr.values as string[][]) || [];
    });
    return result;
  } catch (error) {
    console.error("Sheets fetch error:", error);
    throw error;
  }
}
