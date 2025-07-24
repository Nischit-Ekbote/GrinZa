'use client';
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import CreatePoll from "../../components/createPoll/CreatePoll";
import VotePoll from "../../components/vote/Vote";
import Link from "next/link";

export default function Page() {
    return (
        <div>
            <div className='flex justify-between p-6'>
                    <h1 className='relative z-10'><Link href={"/poll"}>Polls</Link> / Create</h1>
                    <WalletMultiButton/>
                  </div>
            <CreatePoll/>
        </div>
    );
}