
import React from 'react';



export const Header: React.FC = () => {
    return (
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-white/10 px-10 py-3 bg-background-dark sticky top-0 z-50">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-4 text-primary">
                    <div className="size-8 flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl">local_bar</span>
                    </div>
                    <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Bar Manager Pro</h2>
                </div>
            </div>

            <div className="flex flex-1 justify-end gap-8 items-center">
                <label className="hidden lg:flex flex-col min-w-40 h-10 max-w-64">
                    <div className="flex w-full flex-1 items-stretch rounded-lg h-full overflow-hidden">
                        <div className="text-gray-400 flex border-none bg-white/5 items-center justify-center pl-4">
                            <span className="material-symbols-outlined text-xl">search</span>
                        </div>
                        <input
                            className="form-input flex w-full min-w-0 flex-1 border-none bg-white/5 focus:ring-0 h-full placeholder:text-gray-500 px-4 pl-2 text-base font-normal text-white"
                            placeholder="Buscar..."
                            defaultValue=""
                        />
                    </div>
                </label>
                <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-gray-400 hover:text-white cursor-pointer">notifications</span>
                    <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-primary/50" style={{ backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuCTbfP_p1L1zxpz_kNqKIDuLssxrv5Rh7G6sFUannOIZBg8mKUvPcLVNXVzy3ZMg3ZS9L5txL3GKoB9_Tk7oBNC28s9dUNY-4NYkxL1Ykt7Hfm-HSoaYUU8jpaaGwmBTT8mJpmdz0NE2Ktx6vEpyG2Fcx1WUpfnUUTPA4mcUcIy_lzJkr_DfqkniWuXvW9XVoGtCbuF7taHz414kO6yz_ewgjowPBLB2p8QjyLTNaiHjotQXFquSzeawDXM2AfW0PyFBwv9VbJZWpk")` }}></div>
                </div>
            </div>
        </header >
    );
};
