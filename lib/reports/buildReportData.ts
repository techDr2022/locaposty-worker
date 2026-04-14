import { format } from "date-fns";
import { fetchSearchKeywordsData } from "./google-service";
import { refreshLocationToken } from "../refreshLocationToken";
import { prisma } from "../prisma";

type GoogleMetricType =
  | "WEBSITE_CLICKS"
  | "CALL_CLICKS"
  | "BUSINESS_BOOKINGS"
  | "BUSINESS_DIRECTION_REQUESTS"
  | "BUSINESS_IMPRESSIONS_MOBILE_MAPS"
  | "BUSINESS_IMPRESSIONS_MOBILE_SEARCH"
  | "BUSINESS_IMPRESSIONS_DESKTOP_MAPS"
  | "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH"
  | "BUSINESS_CONVERSATIONS"
  | "BUSINESS_FOOD_ORDERS"
  | "BUSINESS_FOOD_MENU_CLICKS";

interface ReviewApi {
  reviewId: string;
  reviewer: {
    displayName: string;
    profilePhotoUrl?: string;
  };
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment: string;
  createTime: string;
  updateTime: string;
  reviewReply?: {
    comment: string;
    updateTime: string;
  };
  name: string;
}

async function fetchGooglePerformanceData(
  location: {
    gmbLocationId: string;
    accessToken: string;
  },
  startDate: Date,
  endDate: Date,
) {
  try {
    const startDateObj = {
      year: startDate.getFullYear(),
      month: startDate.getMonth() + 1,
      day: startDate.getDate(),
    };

    const endDateObj = {
      year: endDate.getFullYear(),
      month: endDate.getMonth() + 1,
      day: endDate.getDate(),
    };

    const metrics: GoogleMetricType[] = [
      "WEBSITE_CLICKS",
      "CALL_CLICKS",
      "BUSINESS_BOOKINGS",
      "BUSINESS_DIRECTION_REQUESTS",
      "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
      "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
      "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
      "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
      "BUSINESS_CONVERSATIONS",
      "BUSINESS_FOOD_ORDERS",
      "BUSINESS_FOOD_MENU_CLICKS",
    ];

    let apiUrl = `https://businessprofileperformance.googleapis.com/v1/locations/${location.gmbLocationId}:fetchMultiDailyMetricsTimeSeries`;

    metrics.forEach((metric) => {
      apiUrl += `&dailyMetrics=${encodeURIComponent(metric)}`;
    });

    apiUrl += `&dailyRange.start_date.year=${startDateObj.year}&dailyRange.start_date.month=${startDateObj.month}&dailyRange.start_date.day=${startDateObj.day}`;
    apiUrl += `&dailyRange.end_date.year=${endDateObj.year}&dailyRange.end_date.month=${endDateObj.month}&dailyRange.end_date.day=${endDateObj.day}`;

    apiUrl = apiUrl.replace("&", "?");

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${location.accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `API call failed: ${response.status} ${response.statusText}`,
      );
      return null;
    }

    const data = await response.json();

    const processedMetrics: Array<{
      date: Date;
      views: number;
      websiteClicks: number;
      callClicks: number;
      directionRequests: number;
      bookings: number;
      foodOrders: number;
      foodMenuClicks: number;
      conversations: number;
      mobileMapViews: number;
      mobileSearchViews: number;
      desktopMapViews: number;
      desktopSearchViews: number;
    }> = [];

    const metricsByDate = new Map<
      string,
      {
        date: Date;
        views: number;
        websiteClicks: number;
        callClicks: number;
        directionRequests: number;
        bookings: number;
        foodOrders: number;
        foodMenuClicks: number;
        conversations: number;
        mobileMapViews: number;
        mobileSearchViews: number;
        desktopMapViews: number;
        desktopSearchViews: number;
      }
    >();

    if (data && data.multiDailyMetricTimeSeries) {
      for (const metricSeries of data.multiDailyMetricTimeSeries) {
        if (metricSeries.dailyMetricTimeSeries) {
          for (const dailyMetric of metricSeries.dailyMetricTimeSeries) {
            const metricType = dailyMetric.dailyMetric as GoogleMetricType;

            if (dailyMetric.timeSeries && dailyMetric.timeSeries.datedValues) {
              for (const dataPoint of dailyMetric.timeSeries.datedValues) {
                if (dataPoint.date) {
                  const metricDate = new Date(
                    dataPoint.date.year,
                    dataPoint.date.month - 1,
                    dataPoint.date.day,
                  );

                  const dateKey = metricDate.toISOString().split("T")[0];

                  const metricValue =
                    dataPoint.value !== undefined
                      ? parseInt(dataPoint.value, 10)
                      : dataPoint.metric !== undefined
                        ? parseInt(dataPoint.metric, 10)
                        : 0;

                  if (!metricsByDate.has(dateKey)) {
                    metricsByDate.set(dateKey, {
                      date: metricDate,
                      views: 0,
                      websiteClicks: 0,
                      callClicks: 0,
                      directionRequests: 0,
                      bookings: 0,
                      foodOrders: 0,
                      foodMenuClicks: 0,
                      conversations: 0,
                      mobileMapViews: 0,
                      mobileSearchViews: 0,
                      desktopMapViews: 0,
                      desktopSearchViews: 0,
                    });
                  }

                  const dateMetrics = metricsByDate.get(dateKey)!;

                  switch (metricType) {
                    case "WEBSITE_CLICKS":
                      dateMetrics.websiteClicks = metricValue;
                      break;
                    case "CALL_CLICKS":
                      dateMetrics.callClicks = metricValue;
                      break;
                    case "BUSINESS_BOOKINGS":
                      dateMetrics.bookings = metricValue;
                      break;
                    case "BUSINESS_DIRECTION_REQUESTS":
                      dateMetrics.directionRequests = metricValue;
                      break;
                    case "BUSINESS_IMPRESSIONS_MOBILE_MAPS":
                      dateMetrics.mobileMapViews = metricValue;
                      break;
                    case "BUSINESS_IMPRESSIONS_MOBILE_SEARCH":
                      dateMetrics.mobileSearchViews = metricValue;
                      break;
                    case "BUSINESS_IMPRESSIONS_DESKTOP_MAPS":
                      dateMetrics.desktopMapViews = metricValue;
                      break;
                    case "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH":
                      dateMetrics.desktopSearchViews = metricValue;
                      break;
                    case "BUSINESS_CONVERSATIONS":
                      dateMetrics.conversations = metricValue;
                      break;
                    case "BUSINESS_FOOD_ORDERS":
                      dateMetrics.foodOrders = metricValue;
                      break;
                    case "BUSINESS_FOOD_MENU_CLICKS":
                      dateMetrics.foodMenuClicks = metricValue;
                      break;
                  }
                }
              }
            }
          }
        }
      }

      for (const [, metrics] of metricsByDate) {
        metrics.views =
          metrics.mobileMapViews +
          metrics.mobileSearchViews +
          metrics.desktopMapViews +
          metrics.desktopSearchViews;

        processedMetrics.push(metrics);
      }
    }

    return {
      metrics: processedMetrics,
    };
  } catch (error) {
    console.error("Error fetching Google performance data:", error);
    return null;
  }
}

function processPerformanceData(
  performanceResults: Array<{
    metrics?: Array<{
      date: Date;
      views: number;
      websiteClicks: number;
      callClicks: number;
      directionRequests: number;
      bookings: number;
      foodOrders: number;
      foodMenuClicks: number;
      conversations: number;
      mobileMapViews: number;
      mobileSearchViews: number;
      desktopMapViews: number;
      desktopSearchViews: number;
    }>;
  } | null>,
  startDate: Date,
  endDate: Date,
) {
  const daysDiff = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );
  const dataPoints = [];

  try {
    const metricsMap = new Map();

    performanceResults.forEach((locationData) => {
      if (!locationData || !locationData.metrics) return;

      locationData.metrics.forEach((metric) => {
        const metricDate = metric.date;
        const dateKey = metricDate.toISOString().split("T")[0];

        if (!metricsMap.has(dateKey)) {
          metricsMap.set(dateKey, {
            views: 0,
            clicks: 0,
            calls: 0,
            directions: 0,
            bookings: 0,
            foodOrders: 0,
            foodMenuClicks: 0,
            conversations: 0,
            mobileMapViews: 0,
            mobileSearchViews: 0,
            desktopMapViews: 0,
            desktopSearchViews: 0,
          });
        }

        const dateMetrics = metricsMap.get(dateKey);

        dateMetrics.views += metric.views || 0;
        dateMetrics.clicks += metric.websiteClicks || 0;
        dateMetrics.calls += metric.callClicks || 0;
        dateMetrics.directions += metric.directionRequests || 0;
        dateMetrics.bookings += metric.bookings || 0;
        dateMetrics.foodOrders += metric.foodOrders || 0;
        dateMetrics.foodMenuClicks += metric.foodMenuClicks || 0;
        dateMetrics.conversations += metric.conversations || 0;
        dateMetrics.mobileMapViews += metric.mobileMapViews || 0;
        dateMetrics.mobileSearchViews += metric.mobileSearchViews || 0;
        dateMetrics.desktopMapViews += metric.desktopMapViews || 0;
        dateMetrics.desktopSearchViews += metric.desktopSearchViews || 0;
      });
    });

    for (let i = 0; i < daysDiff; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateKey = currentDate.toISOString().split("T")[0];
      const formattedDate = format(currentDate, "MMM dd, yyyy");

      const dateMetrics = metricsMap.get(dateKey);

      if (dateMetrics) {
        dataPoints.push({
          date: formattedDate,
          ...dateMetrics,
        });
      } else {
        dataPoints.push({
          date: formattedDate,
          views: 0,
          clicks: 0,
          calls: 0,
          directions: 0,
          bookings: 0,
          foodOrders: 0,
          foodMenuClicks: 0,
          conversations: 0,
          mobileMapViews: 0,
          mobileSearchViews: 0,
          desktopMapViews: 0,
          desktopSearchViews: 0,
        });
      }
    }

    return dataPoints;
  } catch (error) {
    console.error("Error processing performance data:", error);
    throw error;
  }
}

async function getReviewData(
  startDate: Date,
  endDate: Date,
  locations: Array<{
    id: string;
    gmbAccountId: string;
    gmbLocationId: string;
  }>,
) {
  const allReviews: ReviewApi[] = [];

  for (const location of locations) {
    const token = await refreshLocationToken(location.id);
    const reviewResponse = await fetch(
      `https://mybusiness.googleapis.com/v4/${location.gmbAccountId}/locations/${location.gmbLocationId}/reviews`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    const reviewData = await reviewResponse.json();
    const reviews = reviewData.reviews || [];
    allReviews.push(...reviews);
  }

  const filteredReviews = allReviews.filter((review) => {
    const reviewDate = new Date(review.createTime);
    return reviewDate >= startDate && reviewDate <= endDate;
  });

  const totalReviews = filteredReviews.length;

  const totalRating = filteredReviews.reduce(
    (sum: number, review: ReviewApi) => {
      const ratingMap = {
        ONE: 1,
        TWO: 2,
        THREE: 3,
        FOUR: 4,
        FIVE: 5,
      };
      return sum + ratingMap[review.starRating];
    },
    0,
  );
  const averageRating = totalReviews > 0 ? totalRating / totalReviews : 0;

  const ratingDistribution = {
    oneStar: filteredReviews.filter((review) => review.starRating === "ONE")
      .length,
    twoStar: filteredReviews.filter((review) => review.starRating === "TWO")
      .length,
    threeStar: filteredReviews.filter((review) => review.starRating === "THREE")
      .length,
    fourStar: filteredReviews.filter((review) => review.starRating === "FOUR")
      .length,
    fiveStar: filteredReviews.filter((review) => review.starRating === "FIVE")
      .length,
  };

  const repliedReviews = filteredReviews.filter(
    (review) => review.reviewReply,
  ).length;
  const replyRate =
    totalReviews > 0 ? (repliedReviews / totalReviews) * 100 : 0;

  let totalResponseTime = 0;
  let repliedReviewsCount = 0;

  filteredReviews.forEach((review: ReviewApi) => {
    if (review.reviewReply) {
      const responseTime =
        new Date(review.reviewReply.updateTime).getTime() -
        new Date(review.createTime).getTime();
      totalResponseTime += responseTime;
      repliedReviewsCount++;
    }
  });

  const averageReplyResponseTime =
    repliedReviewsCount > 0 ? totalResponseTime / repliedReviewsCount : 0;

  const reviewsByDate = new Map<
    string,
    {
      date: string;
      total: number;
      positive: number;
      negative: number;
      neutral: number;
      replied: number;
    }
  >();

  filteredReviews.forEach((review: ReviewApi) => {
    const date = new Date(review.createTime).toISOString().split("T")[0];
    if (!reviewsByDate.has(date)) {
      reviewsByDate.set(date, {
        date,
        total: 0,
        positive: 0,
        negative: 0,
        neutral: 0,
        replied: 0,
      });
    }

    const dateData = reviewsByDate.get(date)!;
    dateData.total++;

    if (review.starRating === "FOUR" || review.starRating === "FIVE") {
      dateData.positive++;
    } else if (review.starRating === "ONE" || review.starRating === "TWO") {
      dateData.negative++;
    } else {
      dateData.neutral++;
    }

    if (review.reviewReply) {
      dateData.replied++;
    }
  });

  const timeSeriesData = Array.from(reviewsByDate.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return {
    summary: {
      totalReviews,
      averageRating: parseFloat(averageRating.toFixed(2)),
      ratingDistribution,
      replyRate: parseFloat(replyRate.toFixed(2)),
      averageReplyResponseTime: Math.round(
        averageReplyResponseTime / (1000 * 60 * 60),
      ),
    },
    timeSeries: timeSeriesData,
  };
}

export async function buildReportDataForLocation(
  locationId: string,
  startDate: Date,
  endDate: Date,
): Promise<{
  performanceData: Array<Record<string, number | string>>;
  reviewData: {
    summary: {
      totalReviews: number;
      averageRating: number;
      replyRate: number;
      averageReplyResponseTime: number;
      ratingDistribution: {
        oneStar: number;
        twoStar: number;
        threeStar: number;
        fourStar: number;
        fiveStar: number;
      };
    };
    timeSeries: Array<{
      date: string;
      total: number;
      positive: number;
      negative: number;
      neutral: number;
      replied: number;
    }>;
  };
  searchKeywords: Array<{ keyword: string; impressions: number }>;
}> {
  const token = await refreshLocationToken(locationId);
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { gmbLocationId: true, gmbAccountId: true },
  });

  if (!location?.gmbLocationId || !location.gmbAccountId) {
    throw new Error("Location not found or missing GMB IDs");
  }

  const loc = {
    id: locationId,
    gmbAccountId: location.gmbAccountId,
    gmbLocationId: location.gmbLocationId,
  };

  const perf = await fetchGooglePerformanceData(
    { gmbLocationId: location.gmbLocationId, accessToken: token },
    startDate,
    endDate,
  );
  const performanceData = processPerformanceData([perf], startDate, endDate);

  const reviewData = await getReviewData(startDate, endDate, [loc]);

  const keywordsData = await fetchSearchKeywordsData(
    { gmbLocationId: location.gmbLocationId, accessToken: token },
    startDate,
    endDate,
  );

  const topKeywords =
    keywordsData?.searchKeywordsCounts
      ?.map(
        (k: {
          searchKeyword: string;
          insightsValue: { value?: string; threshold?: string };
        }) => ({
          keyword: k.searchKeyword,
          impressions: parseInt(
            k.insightsValue.value || k.insightsValue.threshold || "0",
          ),
        }),
      )
      .sort(
        (a: { impressions: number }, b: { impressions: number }) =>
          b.impressions - a.impressions,
      )
      .slice(0, 10) ?? [];

  return {
    performanceData,
    reviewData,
    searchKeywords: topKeywords,
  };
}
