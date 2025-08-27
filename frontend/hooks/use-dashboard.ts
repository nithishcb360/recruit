import { useState, useEffect } from 'react';
import { getDashboardMetrics, getSourcePerformance, getRecentActivity, getJobsAnalytics } from '@/lib/api/analytics';
import type { DashboardMetrics, SourcePerformance, RecentActivity, JobAnalytics } from '@/lib/api/analytics';

export function useDashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data = await getDashboardMetrics();
        setMetrics(data);
      } catch (err: any) {
        setError(err.detail || 'Failed to fetch dashboard metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  return { metrics, loading, error };
}

export function useSourcePerformance() {
  const [sources, setSources] = useState<SourcePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        setLoading(true);
        const data = await getSourcePerformance();
        setSources(data);
      } catch (err: any) {
        setError(err.detail || 'Failed to fetch source performance');
      } finally {
        setLoading(false);
      }
    };

    fetchSources();
  }, []);

  return { sources, loading, error };
}

export function useRecentActivity() {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const data = await getRecentActivity();
        setActivities(data);
      } catch (err: any) {
        setError(err.detail || 'Failed to fetch recent activity');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, []);

  return { activities, loading, error };
}

export function useJobsAnalytics() {
  const [jobs, setJobs] = useState<JobAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getJobsAnalytics();
      setJobs(data);
    } catch (err: any) {
      setError(err.detail || 'Failed to fetch jobs analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  return { jobs, loading, error, refetch: fetchJobs };
}
