import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useTokenBalances } from '../hooks/useTokenBalances';
import { useWallet } from '../context/WalletContext';

export const TokenBalances = () => {
  const { publicKey } = useWallet();
  const { balances, refetch } = useTokenBalances(publicKey);

  const handleRefresh = (e: React.MouseEvent) => {
    e.preventDefault();
    refetch();
  };

  if (!publicKey) return null;

  return (
    <div className="w-full bg-[#1E2A37]/50 backdrop-blur-lg rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-400">Available Balance</h3>
        <button
          onClick={handleRefresh}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
          title="Refresh balances"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="space-y-3">
        {balances.map(({ token, balance, isLoading, error }) => (
          <motion.div
            key={token.symbol}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2D9CDB]/20 to-[#7F56D9]/20 flex items-center justify-center">
              {token.icon ? (
                <img
                  src={token.icon}
                  alt={token.symbol}
                  className="w-6 h-6"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = token.symbol[0];
                  }}
                />
              ) : (
                <span className="text-[#2D9CDB]">{token.symbol[0]}</span>
              )}
            </div>

            <div className="flex-1">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium text-white group-hover:text-[#2D9CDB] transition-colors">
                  {token.symbol}
                </span>
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-[#2D9CDB] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : error ? (
                  <span className="text-sm text-red-400">Error</span>
                ) : (
                  <span className="text-sm font-mono text-gray-300">
                    {balance.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: token.decimals
                    })}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">{token.name}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="text-xs text-gray-500 pt-2 border-t border-white/10">
        {publicKey.slice(0, 4)}...{publicKey.slice(-4)}
      </div>
    </div>
  );
};