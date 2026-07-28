import { useEffect, useState } from 'react';
import api from '../services/api';
import { Strategy } from '../types';
import { Plus, Trash2, Sparkles, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function StrategyBuilder() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [agentResult, setAgentResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [agentLoading, setAgentLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newStrategy, setNewStrategy] = useState({ name: '', description: '', riskAppetite: 'MODERATE' as const });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data } = await api.get('/strategies');
      setStrategies(data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const runAgentAnalysis = async () => {
    setAgentLoading(true);
    try {
      const { data } = await api.post('/agents/run/strategyAdvisor');
      setAgentResult(data);
      toast.success('Strategy recommendations generated');
    } catch (error) { toast.error('Failed'); }
    finally { setAgentLoading(false); }
  };

  const createStrategy = async () => {
    try {
      await api.post('/strategies', { ...newStrategy, rules: { type: 'CUSTOM', allocations: [] } });
      setShowCreate(false);
      setNewStrategy({ name: '', description: '', riskAppetite: 'MODERATE' });
      fetchData();
      toast.success('Strategy created');
    } catch (error) { toast.error('Failed'); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="spinner" style={{width:32,height:32,borderWidth:3}} /></div>;

  const agentData = agentResult?.agentOutputs?.['strategy-advisor']?.data;
  const recommendations = agentData?.recommendations || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Strategy Builder</h1>
            <p className="text-xs text-slate-400">AI-powered strategy recommendations</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(!showCreate)} className="btn-ghost text-sm flex items-center gap-2"><Plus size={14} /> New Strategy</button>
          <button onClick={runAgentAnalysis} disabled={agentLoading} className="btn-glow text-sm flex items-center gap-2">
            {agentLoading ? <div className="spinner" /> : <Sparkles size={14} />}
            Get AI Recommendations
          </button>
        </div>
      </div>

      {/* Agent Recommendations */}
      {recommendations.length > 0 && (
        <div className="glass-card p-5 border border-cyan-500/20 animate-fade-up">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-cyan-400" />
            <h2 className="font-semibold text-white">AI Recommendations</h2>
            <span className="ml-auto text-xs text-slate-400">Score: <span className="text-cyan-400 font-bold">{agentResult?.overallScore?.toFixed(0)}/100</span></span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recommendations.map((rec: any, i: number) => (
              <div key={i} className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-white">{rec.name}</h3>
                  <span className="text-lg font-bold text-cyan-400">{rec.allocation}%</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-400"><span>Risk</span><span className="text-slate-300">{rec.risk}</span></div>
                  <div className="flex justify-between text-slate-400"><span>Horizon</span><span className="text-slate-300">{rec.horizon}</span></div>
                  <div className="flex justify-between text-slate-400"><span>Expected Return</span><span className="text-green-400">{rec.expectedReturn}</span></div>
                </div>
                <p className="text-xs text-slate-400 mt-2">{rec.rationale}</p>
                {/* Allocation bar */}
                <div className="mt-3 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all" style={{ width: `${rec.allocation}%` }} />
                </div>
              </div>
            ))}
          </div>
          {agentData?.nextActions && (
            <div className="mt-4 p-3 rounded-xl bg-slate-800/30 border border-slate-700/30">
              <p className="text-xs font-semibold text-white mb-2">Next Actions</p>
              {agentData.nextActions.map((act: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${act.priority === 'HIGH' ? 'bg-red-400' : 'bg-yellow-400'}`} />
                  <span className="text-slate-300">{act.action}</span>
                  <span className="text-slate-500 ml-auto">{act.priority}</span>
                </div>
              ))}
            </div>
          )}
          {agentData?.disclaimer && <p className="text-[10px] text-slate-500 mt-3">{agentData.disclaimer}</p>}
        </div>
      )}

      {/* Create Strategy */}
      {showCreate && (
        <div className="glass-card p-5 border border-blue-500/20 animate-fade-up">
          <h2 className="font-semibold text-white mb-4">Create Strategy</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input type="text" value={newStrategy.name} onChange={(e) => setNewStrategy({ ...newStrategy, name: e.target.value })} className="input-glass" placeholder="Strategy name" />
            <input type="text" value={newStrategy.description} onChange={(e) => setNewStrategy({ ...newStrategy, description: e.target.value })} className="input-glass" placeholder="Description" />
            <select value={newStrategy.riskAppetite} onChange={(e) => setNewStrategy({ ...newStrategy, riskAppetite: e.target.value as any })} className="input-glass">
              <option value="CONSERVATIVE">Conservative</option>
              <option value="MODERATE">Moderate</option>
              <option value="AGGRESSIVE">Aggressive</option>
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={createStrategy} className="btn-glow text-sm">Create</button>
            <button onClick={() => setShowCreate(false)} className="btn-ghost text-sm">Cancel</button>
          </div>
        </div>
      )}

      {/* Existing Strategies */}
      <div className="glass-card p-5 animate-fade-up stagger-2">
        <h2 className="font-semibold text-white mb-4">Your Strategies</h2>
        {strategies.length > 0 ? (
          <div className="space-y-2">
            {strategies.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:border-slate-600/50 transition-all">
                <div>
                  <h3 className="text-sm font-medium text-white">{s.name}</h3>
                  <p className="text-xs text-slate-400">{s.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300">{s.riskAppetite}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-500/15 text-blue-400">{s.status}</span>
                  <button onClick={async () => { await api.delete(`/strategies/${s.id}`); fetchData(); }} className="text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-slate-400 text-sm">No strategies yet</p>}
      </div>
    </div>
  );
}
