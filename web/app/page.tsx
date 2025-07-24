'use client';
import React, { useEffect, useRef } from 'react';
import { ArrowRight, Github, GithubIcon } from 'lucide-react';
import Link from 'next/link';

const Page: React.FC = () => {

  return (
    <div className="min-h-screen relative overflow-hidden ">
      <Link href={'https://github.com/Nischit-Ekbote/GrinZa'} className='flex py-2 gap-2 items-center absolute left-0 top-0 z-11 bg-gray-400 m-4 rounded px-4 text-black hover:bg-gray-700 hover:text-white transition-colors'>
      <div className='p-1 bg-white rounded-full '>
        <Github size={15} className='text-black'/>
      </div>
        <p>Github</p>
      </Link>
      <div className="relative z-10">
        {/* Hero Section */}
        <div className="min-h-screen flex flex-col justify-center items-center px-6">
          <div className="text-center max-w-4xl mx-auto">
            {/* Logo */}
            <h1 className="text-8xl md:text-7xl text-transparent mb-6 text-white tracking-tight">
              Grin-<span className='bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent'>Za</span>
            </h1>

            {/* Tagline */}
            <p className="text-2xl md:text-xl text-purple-200 mb-8 font-light font-mono">
              Capture Joy, Share Smiles
            </p>


            {/* CTA Button */}
            <div className="flex justify-center">
              <Link href={"/poll"} className="group border border-white/30  text-white font-semibold py-3 px-8 rounded transition-all duration-300 transform hover:scale-105 hover:shadow-2xl flex items-center space-x-3">
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;