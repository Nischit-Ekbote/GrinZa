'use client';
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import CreatePoll from "../../components/createPoll/CreatePoll";
import VotePoll from "../../components/vote/Vote";
import Link from "next/link";
import AirdropButton from "@/app/components/ui/AirDropButton";

export default function Page() {
    return (
        <div>
            <div className='flex justify-between p-6 absolute top-0 left-0 right-0'>
                    <h1 className='relative z-10'><Link href={"/poll"}>Polls</Link> / Create</h1>
                    <div className="flex items-center space-x-4">
                        <AirdropButton/>
                    <WalletMultiButton/>
                    </div>
                  </div>
            <CreatePoll/>
        </div>
    );
}