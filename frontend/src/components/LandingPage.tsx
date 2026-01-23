import React from 'react';
import { Rocket, Sparkles, Database, Users, ArrowRight, Globe, ShieldCheck, Zap } from 'lucide-react';

interface LandingPageProps {
    onLoginClick: () => void;
    onRegisterClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick, onRegisterClick }) => {
    return (
        <div className="min-h-screen bg-[#0f172a] text-white font-sans overflow-x-hidden relative">
            {/* Background Elements */}
            <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#1e3a8a]/20 to-transparent pointer-events-none" />
            <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-40 -left-20 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Navbar */}
            <nav className="relative z-50 flex items-center justify-between px-6 py-6 max-w-7xl mx-auto">
                <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg shadow-lg shadow-blue-500/20">
                        <Rocket size={24} className="text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">星际云旅行</span>
                </div>
                <div className="flex items-center gap-6">
                    <button
                        onClick={onLoginClick}
                        className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
                    >
                        登录
                    </button>
                    <button
                        onClick={onRegisterClick}
                        className="px-5 py-2.5 text-sm font-semibold bg-white text-blue-900 rounded-full hover:bg-gray-100 transition-all shadow-lg shadow-white/10 active:scale-95"
                    >
                        免费注册
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 pt-20 pb-32 px-6 max-w-7xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm font-medium mb-8 animate-fade-in-up">
                    <Sparkles size={16} />
                    <span>全新 AI 智能行程引擎已上线</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-blue-200">
                    智能行程定制<br />
                    <span className="text-blue-500">重新定义旅行</span>
                </h1>

                <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-400 mb-12 leading-relaxed">
                    星际云旅行结合前沿 AI 技术与全球海量资源库，助您在几分钟内生成专业级行程单。
                    多人实时协作，让每一次出发都充满期待。
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button
                        onClick={onLoginClick}
                        className="group relative px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full font-bold text-lg transition-all shadow-xl shadow-blue-600/20 active:scale-95 w-full sm:w-auto overflow-hidden"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            开启您的旅程 <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>

                    <button className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full font-medium text-lg transition-all backdrop-blur-sm w-full sm:w-auto">
                        了解更多
                    </button>
                </div>

                {/* Floating UI Mockup/Preview could go here */}
                <div className="mt-20 relative mx-auto max-w-5xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden aspect-[16/9] group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-purple-500/5" />

                    {/* Mockup Content - Simplified representation of the app interface */}
                    <div className="p-8 h-full flex flex-col">
                        {/* Mock Header */}
                        <div className="flex items-center justify-between mb-8 opacity-50">
                            <div className="flex gap-4">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                <div className="w-3 h-3 rounded-full bg-green-400" />
                            </div>
                            <div className="h-2 w-32 bg-white/20 rounded-full" />
                        </div>

                        {/* Mock Grid */}
                        <div className="grid grid-cols-4 gap-4 flex-1">
                            <div className="col-span-1 bg-white/5 rounded-xl border border-white/5 p-4 space-y-4">
                                <div className="h-4 w-1/2 bg-white/20 rounded" />
                                <div className="h-2 w-full bg-white/10 rounded" />
                                <div className="h-2 w-3/4 bg-white/10 rounded" />
                                <div className="h-20 w-full bg-blue-500/20 rounded-lg mt-auto" />
                            </div>
                            <div className="col-span-3 bg-white/5 rounded-xl border border-white/5 p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 pointer-events-none">
                                    <Sparkles className="text-blue-400 opacity-50" size={32} />
                                </div>
                                <div className="space-y-6">
                                    <div className="h-8 w-2/3 bg-white/10 rounded-lg" />
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="h-24 bg-white/5 rounded-lg border border-white/5" />
                                        <div className="h-24 bg-white/5 rounded-lg border border-white/5" />
                                        <div className="h-24 bg-white/5 rounded-lg border border-white/5" />
                                    </div>
                                    <div className="h-40 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-white/5" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Features Grid */}
            <section className="py-24 bg-[#0b1120] relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold mb-4">为什么选择星际云旅行？</h2>
                        <p className="text-gray-400">专为高端定制游设计的全能工作台</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Zap className="text-yellow-400" />}
                            title="AI 智能排程"
                            desc="输入需求，秒级生成完整行程单。智能推荐路线、酒店与活动，效率提升 10 倍。"
                        />
                        <FeatureCard
                            icon={<Database className="text-blue-400" />}
                            title="全球资源库"
                            desc="内置海量 POI 数据，涵盖酒店、景点、用车。一键调用，轻松管理私有与公有资源。"
                        />
                        <FeatureCard
                            icon={<Users className="text-purple-400" />}
                            title="多人实时协作"
                            desc="团队成员同步编辑，变更实时更新。告别文件传输，让协作像对话一样简单。"
                        />
                        <FeatureCard
                            icon={<Globe className="text-green-400" />}
                            title="多币种自动结算"
                            desc="内置汇率计算引擎，自动统计成本与报价。精准控制利润率，从此告别繁琐制表。"
                        />
                        <FeatureCard
                            icon={<ShieldCheck className="text-indigo-400" />}
                            title="数据安全保障"
                            desc="企业级数据加密，私有资源隔离存储。您的商业机密，我们像守卫星球一样守护。"
                        />
                        <FeatureCard
                            icon={<Rocket className="text-red-400" />}
                            title="极速导出交付"
                            desc="一键导出精美 Excel 行程单。支持自定义格式，直接发送给客户，尽显专业风范。"
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/10 py-12 bg-[#0f172a] text-center text-gray-500 text-sm">
                <p>&copy; {new Date().getFullYear()} Interstellar Cloud Travel. All rights reserved.</p>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
    <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 hover:bg-white/10 transition-all group">
        <div className="mb-4 p-3 bg-white/5 rounded-xl w-fit group-hover:scale-110 transition-transform">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
        <p className="text-gray-400 leading-relaxed">{desc}</p>
    </div>
);
