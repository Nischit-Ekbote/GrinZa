'use client';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Transaction } from '@solana/web3.js';
import axios from 'axios';
import React from 'react';
import { Vote, Image, Loader2, X, Sparkles, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';

interface NFT {
  mint: string;
  name: string;
  image: string | null;
  symbol: string;
  description: string | null;
  uri: string;
}

interface APIResponse {
  success: boolean;
  nfts: NFT[];
  error?: string;
}

function CreatePoll() {
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [nft, setNft] = React.useState<string>("");
  const [selectedNftName, setSelectedNftName] = React.useState<string>("");
  const [showPopup, setShowPopup] = React.useState<boolean>(false);
  const [nfts, setNfts] = React.useState<NFT[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [creatingPoll, setCreatingPoll] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string>("");
  const [success, setSuccess] = React.useState<string>("");

  // Function to fetch NFTs from wallet using your API
  const fetchNFTs = async (): Promise<void> => {
    if (!wallet) {
      setError("Please connect your wallet first");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const response = await axios.post<APIResponse>('/api/nft', {
        wallet: wallet.publicKey.toBase58(),
      });

      console.log("Fetched NFTs:", response.data);
      
      const { success, nfts: fetchedNfts, error: apiError } = response.data;
      
      if (!success) {
        setError(apiError || "Failed to fetch NFTs");
        setLoading(false);
        return;
      }

      // Transform the data to match our component's expected format
      const transformedNfts: NFT[] = fetchedNfts?.map((nft: NFT) => ({
        mint: nft.mint,
        name: nft.name || "Unnamed NFT",
        image: nft.image,
        symbol: nft.symbol || "",
        description: nft.description,
        uri: nft.uri,
      })) || [];

      setNfts(transformedNfts);
    } catch (error) {
      console.error("Error fetching NFTs:", error);
      setError("Failed to fetch NFTs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectNFT = (selectedNft: NFT): void => {
    setNft(selectedNft.mint);
    setSelectedNftName(selectedNft.name);
    setShowPopup(false);
    setError("");
  };

  const handleCreatePoll = async (): Promise<void> => {
    setCreatingPoll(true);
    setError("");
    setSuccess("");
    
    try {
      if (!wallet) {
        console.error("Wallet not connected");
        return;
      }

      if (!nft) {
        setError("Please select an NFT first");
        return;
      }

      const res = await axios.post('/api/polls', {
        nftMint: nft,
        wallet: wallet.publicKey.toBase58(),
      });

      const { success, transaction } = res.data;
      if (!success || !transaction) {
        console.error("Failed to get transaction from server");
        setError("Failed to get transaction from server");
        return;
      }

      const tx = Transaction.from(new Uint8Array(transaction));
      // Sign the transaction
      const signedTx = await wallet.signTransaction(tx);
      // Send it to Solana
      const txid = await connection.sendRawTransaction(signedTx.serialize());
      await connection.confirmTransaction(txid, "confirmed");
      console.log("Poll created, txid:", txid);
      
      setSuccess("🎉 Poll created successfully!");
      
      // Reset form after delay
      setTimeout(() => {
        setNft("");
        setSelectedNftName("");
        setSuccess("");
      }, 3000);
    } catch (err : any) {
      const message = err?.message || err?.toString() || ""
      if (message.includes("already been processed") || message.includes("custom program error: 0x0")) {
        toast.success("Poll already created for this NFT!");
        setSuccess("Poll already created for this NFT!");
        return
      }
      console.error("Error creating poll:", error);
      setError("Failed to create poll. Please try again.");
    } finally {
      setCreatingPoll(false);
    }
  };

  const openNFTSelector = (): void => {
    setShowPopup(true);
    if (nfts.length === 0) {
      fetchNFTs();
    }
  };

  if (!wallet?.publicKey) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Vote className="w-24 h-24 text-purple-300 mx-auto mb-6" />
          <h1 className="text-4xl text-white mb-4">Create Poll</h1>
          <p className="text-purple-200 text-lg mb-8">Please connect your wallet to continue</p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text mt-10 mb-4">
          <h1 className="text-5xl text-white bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Create Poll
          </h1>
          <p className="text-purple-200 text-lg mt-2">Create a community poll using your NFT</p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 backdrop-blur-md rounded-2xl p-4 mb-6">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-500/20 border border-green-500/30 backdrop-blur-md rounded-2xl p-4 mb-6">
            <p className="text-green-300">{success}</p>
          </div>
        )}

        {/* Main Content Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 mb-8 border border-white/20">
          <div className="flex items-center space-x-3 mb-6">
            <Sparkles className="w-8 h-8 text-purple-400" />
            <h2 className="text-2xl text-white">Poll Configuration</h2>
          </div>

          {/* NFT Selection Section */}
          <div className="mb-8">
            <label className="block text-purple-200 text-sm font-medium mb-3">
              Select NFT for Poll
            </label>
            
            {selectedNftName ? (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
                      <Image className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{selectedNftName}</h3>
                      <p className="text-purple-300 text-sm font-mono">
                        {nft.slice(0, 8)}...{nft.slice(-8)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 text-sm">Selected</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 border-dashed mb-4">
                <div className="text-center">
                  <Image className="w-12 h-12 text-purple-300 mx-auto mb-3 opacity-50" />
                  <p className="text-purple-300 mb-2">No NFT selected</p>
                  <p className="text-purple-400 text-sm">Choose an NFT from your wallet to create a poll</p>
                </div>
              </div>
            )}

            <button
              onClick={openNFTSelector}
              disabled={!wallet}
              className="w-full bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-semibold py-4 px-8 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3"
              type="button"
            >
              <Plus className="w-5 h-5" />
              <span>{selectedNftName ? "Change NFT" : "Select NFT"}</span>
            </button>
          </div>

          {/* Create Poll Button */}
          <button
            onClick={handleCreatePoll}
            disabled={!wallet || !nft || creatingPoll}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center space-x-3"
            type="button"
          >
            {creatingPoll ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Creating Poll...</span>
              </>
            ) : (
              <>
                <Vote className="w-6 h-6" />
                <span>Create Poll</span>
              </>
            )}
          </button>
        </div>

        {/* NFT Selection Popup */}
        {showPopup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
              {/* Popup Header */}
              <div className="flex justify-between items-center p-6 border-b border-white/20">
                <div>
                  <h2 className="text-2xl font-semibold text-white">Select Your NFT</h2>
                  <p className="text-purple-200 text-sm mt-1">Choose an NFT from your wallet</p>
                </div>
                <button
                  onClick={() => setShowPopup(false)}
                  className="text-purple-300 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-xl"
                  aria-label="Close popup"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Popup Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {loading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" />
                    <p className="text-white text-lg">Loading your NFTs...</p>
                    <p className="text-purple-300 text-sm">This may take a moment</p>
                  </div>
                ) : nfts.length === 0 ? (
                  <div className="text-center py-12">
                    <Image className="w-16 h-16 text-purple-300 mx-auto mb-4 opacity-50" />
                    <p className="text-white text-lg mb-2">No NFTs found</p>
                    <p className="text-purple-300 text-sm mb-6">No NFTs were found in your wallet</p>
                    <button
                      onClick={fetchNFTs}
                      className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-6 py-3 rounded-xl transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nfts.map((nftItem: NFT) => (
                      <div
                        key={nftItem.mint}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl p-4 cursor-pointer transition-all duration-300 transform hover:scale-[1.02]"
                        onClick={() => handleSelectNFT(nftItem)}
                      >
                        {nftItem.image ? (
                          <div className="w-full h-32 mb-3 bg-white/5 rounded-xl overflow-hidden">
                            <img
                              src={nftItem.image}
                              alt={nftItem.name}
                              className="w-full h-full object-cover"
                              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-32 mb-3 bg-white/5 rounded-xl flex items-center justify-center">
                            <Image className="w-8 h-8 text-purple-300 opacity-50" />
                          </div>
                        )}
                        <h3 className="font-semibold text-white truncate mb-1">{nftItem.name}</h3>
                        <p className="text-sm text-purple-300 truncate mb-2">{nftItem.symbol}</p>
                        <p className="text-xs text-purple-400 truncate font-mono" title={nftItem.mint}>
                          {nftItem.mint.slice(0, 8)}...{nftItem.mint.slice(-8)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreatePoll;