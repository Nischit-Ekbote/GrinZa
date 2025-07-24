import axios from "axios";
import { useState } from "react";
import { toast } from "sonner";
import { Star, Trophy, Zap, Calendar } from "lucide-react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/router";

function CreateNft({data} : {data: any}) {
    const [name, setName] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const wallet = useAnchorWallet();

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

        try {
            const response = await axios.post('/api/nft/mint', body); 

            if (response.data.success) {
                toast.success(`NFT created successfully`);
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
        if (score < 20) return 'text-purple-300';
        if (score < 40) return 'text-purple-400';
        if (score < 60) return 'text-purple-500';
        if (score < 80) return 'text-purple-600';
        return 'text-purple-300';
    };

    const getScoreIcon = (score: number) => {
        if (score < 20) return '😐';
        if (score < 40) return '🙂';
        if (score < 60) return '😊';
        if (score < 80) return '😄';
        return '🤩';
    };

    return (
        <div className="w-full mx-auto">
            <div className='flex justify-between p-6'>
                          <h1 className='relative z-10'>Create NFT</h1>
                          <WalletMultiButton/>
                      </div>
            {/* Preview Section */}
            <div className="bg-purple-900/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6">
                <div className="flex gap-6 items-start">
                    {/* Image Preview */}
                    <div className="flex-shrink-0">
                        <div className="relative">
                            <img 
                                src={data?.url} 
                                alt="Smile Capture" 
                                className="w-32 h-32 rounded-xl object-cover border border-purple-400/30"
                            />
                            <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                {getScoreIcon(data?.score || 0)} {data?.score.toFixed(2) || 0}%
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="flex-1 space-y-4">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2">Your Smile NFT</h3>
                            <p className="text-purple-200 text-sm">Ready to mint your unique smile as an NFT</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-400/30 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Trophy className="w-4 h-4 text-purple-300" />
                                    <span className="text-xs text-purple-200 font-medium">Smile Score</span>
                                </div>
                                <span className={`text-lg font-bold ${getScoreColor(data?.score || 0)}`}>
                                    {data?.score || 0}%
                                </span>
                            </div>

                            <div className="bg-purple-800/30 backdrop-blur-sm border border-purple-400/30 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="w-4 h-4 text-purple-300" />
                                    <span className="text-xs text-purple-200 font-medium">Captured</span>
                                </div>
                                <span className="text-sm text-white font-medium">
                                    {data?.timestamp ? new Date(data.timestamp).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Input Section */}
            <div className="bg-purple-900/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6 space-y-4">
                <div>
                    <label htmlFor="name" className="block text-lg font-semibold text-white mb-3">
                        NFT Name
                    </label>
                    <input 
                        type="text" 
                        id="name" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter a name for your smile NFT..."
                        className="w-full px-4 py-3 bg-purple-800/30 backdrop-blur-sm border border-purple-400/30 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-400 transition-all duration-300"
                    />
                </div>

                {/* Create Button */}
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !name || !data?.url}
                    className="w-full py-4 px-6 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800/50 disabled:text-purple-400 rounded-xl font-semibold text-lg text-white transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                >
                    <div className="flex items-center justify-center gap-3">
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
                    <div className="bg-green-900/20 backdrop-blur-sm border border-green-500/30 rounded-xl p-4">
                        <p className="text-sm text-green-400 font-medium mb-1">Transaction Hash:</p>
                        <p className="text-xs text-green-200 font-mono break-all">{data.hash}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CreateNft;