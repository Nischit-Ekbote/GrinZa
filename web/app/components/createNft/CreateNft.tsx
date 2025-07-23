import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";
import { Star, Trophy, Zap } from "lucide-react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";

function CreateNft({data} : {data: any}) {
    const [name, setName] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const wallet = useAnchorWallet();

    console.log(wallet);

    const handleSubmit = async () => {
        if (!data || !data.url || !data.timestamp  || !data.score || !name) {
            toast.error("Please ensure all fields are filled out correctly.");
            return;
        }

        setIsLoading(true);
        
        const body = {
            name,
            image: data.url,
            attributes: [
                { trait_type: "Smile Score", value: data.score },
                { trait_type: "Timestamp", value: data.timestamp }
            ],
            user: wallet?.publicKey.toBase58() || "",
        };
        console.log('Creating NFT with body:', body);

        try {
            const response = await axios.post('/api/nft/mint', body); 

            if (response.data.success) {
                toast.success(`NFT created successfully! Mint Address: ${response.data.mint}`);
                console.log('NFT Minted:', response.data);
            } else {
                toast.error(`Failed to create NFT: ${response.data.error}`);
            }   
        } catch (error) {
            console.error('Error creating NFT:', error);
            toast.error('An error occurred while creating the NFT.');
        } finally {
            setIsLoading(false);
        }
    }

    const getScoreColor = (score: number) => {
        if (score < 20) return 'text-slate-400';
        if (score < 40) return 'text-cyan-400';
        if (score < 60) return 'text-blue-400';
        if (score < 80) return 'text-purple-400';
        return 'text-pink-400';
    };

    const getScoreGradient = (score: number) => {
        if (score < 20) return 'from-slate-500/20 to-slate-600/20';
        if (score < 40) return 'from-cyan-500/20 to-blue-500/20';
        if (score < 60) return 'from-blue-500/20 to-purple-500/20';
        if (score < 80) return 'from-purple-500/20 to-pink-500/20';
        return 'from-pink-500/20 to-yellow-500/20';
    };

    return (
        <div className="w-1/2 space-y-6">
            {/* Header */}
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-2xl blur" />
                <div className="relative p-6 bg-slate-800/90 backdrop-blur-xl rounded-2xl border border-purple-500/30">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500/20 rounded-lg">
                            <Star className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Mint Your Smile NFT</h2>
                            <p className="text-slate-300">Turn your smile into a unique digital collectible</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preview Section */}
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-700/40 rounded-3xl blur-xl" />
                <div className="relative bg-slate-800/40 backdrop-blur-2xl rounded-3xl p-8 border border-slate-700/50">
                    <div className="flex gap-6">
                        {/* Image Preview */}
                        <div className="flex-shrink-0">
                            <div className="relative">
                                <div className={`absolute inset-0 bg-gradient-to-r ${getScoreGradient(data?.score || 0)} rounded-2xl blur`} />
                                <div className="relative p-2 bg-slate-800/50 backdrop-blur rounded-2xl border border-slate-600/50">
                                    <img 
                                        src={data?.url} 
                                        alt="Smile Capture" 
                                        className="w-32 h-32 rounded-xl object-cover"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur" />
                                    <div className="relative p-4 bg-slate-700/30 backdrop-blur rounded-xl border border-slate-600/30">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Trophy className="w-4 h-4 text-blue-400" />
                                            <span className="text-sm text-slate-300 font-medium">Smile Score</span>
                                        </div>
                                        <span className={`text-xl font-bold ${getScoreColor(data?.score || 0)}`}>
                                            {data?.score || 0}%
                                        </span>
                                    </div>
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl blur" />
                                    <div className="relative p-4 bg-slate-700/30 backdrop-blur rounded-xl border border-slate-600/30">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Zap className="w-4 h-4 text-green-400" />
                                            <span className="text-sm text-slate-300 font-medium">Captured</span>
                                        </div>
                                        <span className="text-sm text-white font-medium">
                                            {data?.timestamp ? new Date(data.timestamp).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Input Section */}
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-700/40 rounded-3xl blur-xl" />
                <div className="relative bg-slate-800/40 backdrop-blur-2xl rounded-3xl p-8 border border-slate-700/50 space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-lg font-medium text-white mb-3">
                            NFT Name
                        </label>
                        <div className="relative">
                            <input 
                                type="text" 
                                id="name" 
                                value={name} 
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter a name for your smile NFT..."
                                className="w-full px-6 py-4 bg-slate-700/50 backdrop-blur border border-slate-600/50 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300"
                            />
                        </div>
                    </div>

                    {/* Create Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !name || !data?.url}
                        className="relative w-full py-4 px-8 bg-gradient-to-r from-purple-500/90 to-pink-500/90 hover:from-purple-400 hover:to-pink-400 rounded-2xl font-bold text-xl text-white transition-all duration-500 shadow-2xl hover:shadow-purple-500/25 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative flex items-center justify-center gap-4">
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Minting NFT...
                                </>
                            ) : (
                                <>
                                    <Star className="w-5 h-5" />
                                    Create Smile NFT
                                </>
                            )}
                        </div>
                    </button>

                    {data?.hash && (
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl blur" />
                            <div className="relative p-4 bg-slate-700/30 backdrop-blur rounded-xl border border-green-500/30">
                                <p className="text-sm text-green-400 font-medium mb-1">Transaction Hash:</p>
                                <p className="text-xs text-slate-300 font-mono break-all">{data.hash}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CreateNft;