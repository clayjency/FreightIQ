import React, { useState } from 'react';
import { Ship, Info, ArrowRight } from 'lucide-react';

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
    <div className="bg-[#1C2128] rounded-xl border border-gray-800 p-5 mt-6">
      <div className="flex items-center gap-3 mb-4">
        <Ship className="w-5 h-5 text-indigo-400" />
        <h3 className="text-lg font-semibold text-gray-100">Vessel Auto-Recommendation</h3>
      </div>
      
      <p className="text-sm text-gray-400 mb-5">
        Enter your cargo volume and port constraints to instantly find the most efficient vessel class.
      </p>

      <form onSubmit={fetchRecommendation} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Cargo Volume (MT)</label>
            <input
              type="number"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="e.g. 50000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Port Constraints (Optional)</label>
            <input
              type="text"
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              placeholder="e.g. Max draft 12m"
            />
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Get Recommendation'}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 p-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-indigo-400 font-medium mb-1">Recommended Vessel Class</p>
              <h4 className="text-2xl font-bold text-white">{result.recommendedVessel}</h4>
              <p className="text-sm text-gray-300 mt-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-gray-400" />
                {result.reasoning}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 font-medium mb-1">Capacity Utilisation</p>
              <div className="text-xl font-semibold text-emerald-400">{result.utilizationPct}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
