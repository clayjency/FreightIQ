import React, { useState } from 'react';

interface RecommendationResponse {
  recommendedVessel: string;
  inputVolume: number;
  utilizationPct: number;
  reasoning: string;
}

export const VesselRecommender: React.FC = () => {
  const [volume, setVolume] = useState<string>('30000');
  const [constraints, setConstraints] = useState<string>('');
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volume || isNaN(Number(volume))) {
      setError('Please enter a valid volume');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const queryParams = new URLSearchParams({
        volume,
        ...(constraints && { constraints }),
      });
      const response = await fetch(`/api/vessel-recommendation?${queryParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch recommendation');
      }
      
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
      setError('Could not get recommendation. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-[#F1F3F4]">Vessel Recommendation</h3>
        <p className="text-xs text-[#9AA3AA] mt-0.5">
          Assess optimal vessel class based on cargo volume and constraints.
        </p>
      </div>

      <form onSubmit={fetchRecommendation} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#9AA3AA]">Cargo Volume (MT)</label>
            <input
              type="number"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="w-full bg-[#171B1F] border border-[#252A2E] rounded-md px-3.5 py-2 text-[#F1F3F4] text-sm focus:outline-none focus:border-[#19A7CE] focus:ring-1 focus:ring-[#19A7CE]/20 transition-colors"
              placeholder="e.g. 50000"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#9AA3AA]">Port Constraints</label>
            <input
              type="text"
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              className="w-full bg-[#171B1F] border border-[#252A2E] rounded-md px-3.5 py-2 text-[#F1F3F4] text-sm focus:outline-none focus:border-[#19A7CE] focus:ring-1 focus:ring-[#19A7CE]/20 transition-colors"
              placeholder="e.g. Max draft 12m"
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#171B1F] hover:bg-[#1E2328] border border-[#252A2E] hover:border-[#19A7CE]/50 text-[#F1F3F4] rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Assess Vessel Fit'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-[#D94A4A]/10 border border-[#D94A4A]/30 rounded-md text-[#D94A4A] text-xs">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-5 p-4 bg-[#171B1F] border border-[#252A2E] rounded-md">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <p className="text-xs text-[#9AA3AA] block">Recommended Vessel</p>
              <h4 className="text-lg font-bold text-[#F1F3F4] mt-0.5">{result.recommendedVessel}</h4>
              <p className="text-xs text-[#68727A] mt-2 leading-relaxed">
                {result.reasoning}
              </p>
            </div>
            <div className="sm:text-right shrink-0">
              <p className="text-xs text-[#9AA3AA] block">Capacity Utilisation</p>
              <div className="text-base font-semibold text-[#22A06B] mt-0.5">{result.utilizationPct}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
