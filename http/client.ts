import { type Toast } from "../toasts";
import { errorInternalServerError } from "../toasts/errors";

async function fetchDataV1<REQ, RESP>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  data: REQ | null,
): Promise<RESP | Toast> {
  try {
    const options: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };

    if (method !== "GET") {
      options.body = JSON.stringify(data);
    }

    const response = await fetch("/api/v1" + url, options);
    const jsonData: RESP | Toast = await response.json();
    return jsonData;
  } catch (fetchError) {
    console.error("Fetch failed:", fetchError);
    return errorInternalServerError("Грешка при свързване");
  }
}

export async function getV1<RESP>(
  url: string,
): Promise<RESP | Toast> {
  return await fetchDataV1<unknown, RESP>("GET", url, null);
}

export async function postV1<REQ, RESP>(
  url: string,
  data: REQ,
): Promise<RESP | Toast> {
  return await fetchDataV1<REQ, RESP>("POST", url, data);
}

export async function putV1<REQ, RESP>(
  url: string,
  data: REQ,
): Promise<RESP | Toast> {
  return await fetchDataV1<REQ, RESP>("PUT", url, data);
}

export async function deleteV1<RESP>(
  url: string,
): Promise<RESP | Toast> {
  return await fetchDataV1<unknown, RESP>("DELETE", url, null);
}

export async function uploadV1<RESP>(
  url: string,
  formData: FormData,
): Promise<RESP | Toast> {
  try {
    const response = await fetch("/api/v1" + url, {
      method: "POST",
      body: formData,
    });
    const jsonData: RESP | Toast = await response.json();
    return jsonData;
  } catch (fetchError) {
    console.error("Upload failed:", fetchError);
    return errorInternalServerError("Грешка при качване");
  }
}
