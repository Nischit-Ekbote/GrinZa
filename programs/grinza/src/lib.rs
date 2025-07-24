use anchor_lang::prelude::*;

declare_id!("3D34sLyTu4dJ9KjYmHCo9da1sQSqPxFaM8wBJNDib7FS");

#[program]
pub mod grinza {
    use super::*;

    pub fn initialize_poll(ctx: Context<InitializePoll>, nft_mint: Pubkey) -> Result<()> {
        let poll = &mut ctx.accounts.poll;

        poll.owner = ctx.accounts.authority.key();
        poll.nft_mint = nft_mint;
        poll.upvotes = 0;
        poll.downvotes = 0;
        poll.is_active = true;
        poll.bump = ctx.bumps.poll;
        poll.created_at = Clock::get()?.unix_timestamp;

        msg!("✅ Poll initialized for NFT: {}", nft_mint);
        Ok(())
    }

    pub fn close_poll(ctx: Context<ClosePoll>) -> Result<()> {
        let poll = &mut ctx.accounts.poll;

        require!(poll.is_active, GrinzaError::PollAlreadyClosed);
        require_keys_eq!(poll.owner, ctx.accounts.authority.key(), GrinzaError::Unauthorized);

        poll.is_active = false;

        msg!("❌ Poll closed by owner: {}", poll.owner);
        Ok(())
    }

    pub fn vote(ctx: Context<Vote>, is_upvote: bool) -> Result<()> {
        let poll = &mut ctx.accounts.poll;
        let vote_record = &mut ctx.accounts.vote_record;

        require!(poll.is_active, GrinzaError::PollClosed);
        require!(!vote_record.voted, GrinzaError::AlreadyVoted);


        if is_upvote {
            poll.upvotes += 1;
        } else {
            poll.downvotes += 1;
        }

        vote_record.poll = poll.key();
        vote_record.voter = ctx.accounts.voter.key();
        vote_record.voted = true;
        vote_record.is_upvote = is_upvote;
        vote_record.bump = ctx.bumps.vote_record; 

        msg!("✅ Vote recorded by {:?}", ctx.accounts.voter.key());
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(nft_mint: Pubkey)]
pub struct InitializePoll<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        seeds = [b"poll", nft_mint.as_ref()],
        bump,
        space = 8 + Poll::SIZE,
    )]
    pub poll: Account<'info, Poll>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClosePoll<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"poll", poll.nft_mint.as_ref()],
        bump = poll.bump,
    )]
    pub poll: Account<'info, Poll>,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,

    #[account(
        mut,
        seeds = [b"poll", poll.nft_mint.as_ref()],
        bump = poll.bump
    )]
    pub poll: Account<'info, Poll>,

    #[account(
        init,
        payer = voter,
        seeds = [b"vote", poll.key().as_ref(), voter.key().as_ref()],
        bump,
        space = 8 + VoteRecord::SIZE,
    )]
    pub vote_record: Account<'info, VoteRecord>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct Poll {
    pub owner: Pubkey,       // 32
    pub nft_mint: Pubkey,    // 32
    pub upvotes: u32,        // 4
    pub downvotes: u32,      // 4
    pub is_active: bool,     // 1
    pub created_at: i64,     // 8
    pub bump: u8,            // 1
}

impl Poll {
    pub const SIZE: usize = 32 + 32 + 4 + 4 + 1 + 8 + 1; 
}

#[account]
pub struct VoteRecord {
    pub poll: Pubkey,     // 32
    pub voter: Pubkey,    // 32
    pub voted: bool,      // 1
    pub is_upvote: bool,  // 1
    pub bump: u8,         // 1
}

impl VoteRecord {
    pub const SIZE: usize = 32 + 32 + 1 + 1 + 1; // 67 bytes
}

#[error_code]
pub enum GrinzaError {
    #[msg("Voting is closed for this poll.")]
    PollClosed,
    #[msg("You have already voted.")]
    AlreadyVoted,
    #[msg("You are not authorized to perform this action.")]
    Unauthorized,
    #[msg("Poll is already closed.")]
    PollAlreadyClosed,
}