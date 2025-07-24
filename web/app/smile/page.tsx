'use client';

import { useEffect, useState } from "react";
import SmileDetector from "../components/smileDectector/SmileDetector";
import axios from "axios";
import { toast } from "sonner";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import CreateNft from "../components/createNft/CreateNft";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { Wallet } from "lucide-react";

export default function Home() {
    const [maxSmileScore, setMaxSmileScore] = useState(0);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);
    const [steps, setSteps] = useState(0);
    const [hasMounted, setHasMounted] = useState(false);
    const wallet = useAnchorWallet();

    useEffect(() => {
        setHasMounted(true);
    }, []);

    const onClick = async (imageData?: string) => {
        if (maxSmileScore <= 60) {
            toast.error("Smile Harder 😄");
            return;
        }

        if (imageData) {
            setCapturedImage(imageData);
            toast.success('Image captured successfully');
        }

        try {
            const response = await axios.post('/api/smile-score', {
                timestamp: new Date().toISOString(),
                score: maxSmileScore,
                image: imageData
            });

            if (response.data.success) {
                toast.success('Smile captured successfully! 📸');
                setData(response.data.data);
                setSteps(1);
            }
        } catch (error) {
            console.error('Error submitting data:', error);
            toast.error('Failed to submit data');
        }
    };

    if (!wallet?.publicKey) {
        return (
            <div className="min-h-screen flex items-center justify-center text-white p-4 box-border relative z-10">
                <div className="text-center">
                    <Wallet className="w-24 h-24 text-purple-300 mx-auto mb-6" />
                    <h1 className="text-4xl text-white mb-4">Smile</h1>
                    <p className="text-purple-200 text-lg mb-8">Please connect your wallet to continue</p>
                    <WalletMultiButton />
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-black text-white p-4 box-border">

            {/* Step 1: Smile Detection */}
            {steps === 0 &&
                <>
                    <SmileDetector
                        maxSmileScore={maxSmileScore}
                        setMaxSmileScore={setMaxSmileScore}
                        onClick={onClick}
                    />
                </>
            }

            {/* Step 2: NFT Creation */}
            {steps === 1 && (
                <CreateNft data={data} />
            )}
        </div>
    );
}
