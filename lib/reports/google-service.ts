export async function fetchSearchKeywordsData(
  location: {
    gmbLocationId: string;
    accessToken: string | null;
  },
  startDate: Date,
  endDate: Date
): Promise<any> {
  if (!location.accessToken) {
    console.error("No access token available");
    return null;
  }

  try {
    const startDateObj = {
      year: startDate.getFullYear(),
      month: startDate.getMonth() + 1,
    };

    const endDateObj = {
      year: endDate.getFullYear(),
      month: endDate.getMonth() + 1,
    };

    const apiUrl = `https://businessprofileperformance.googleapis.com/v1/locations/${location.gmbLocationId}/searchkeywords/impressions/monthly?monthlyRange.start_month.year=${startDateObj.year}&monthlyRange.start_month.month=${startDateObj.month}&monthlyRange.end_month.year=${endDateObj.year}&monthlyRange.end_month.month=${endDateObj.month}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${location.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`API call failed: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`Error response: ${errorText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching search keywords data:", error);
    return null;
  }
}
