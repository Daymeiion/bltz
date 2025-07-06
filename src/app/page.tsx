import { ArrowLeftIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import players from '@/data/bltz_mock_players.json';
import HeroHeader from '@/components/HeroHeader';

const athlete = players[0]; // Simulate logged-in user

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white flex flex-col items-center">
      {/* Welcome Message */}
      <div className="w-full max-w-md px-4 pt-6 pb-2 text-left">
        <div className="text-lg font-semibold">Welcome back,</div>
        <div className="text-2xl font-bold">{athlete.display_name}</div>
      </div>
      {/* Hero Header */}
      <HeroHeader
        backgroundImage="/assets/Football_Background.png"
        cardImage="/assets/card-placeholder.png" // Replace with your card image filename
        profileImage={athlete.image_url}
        alt={athlete.display_name}
      />
      {/* Header (optional, can be moved or removed) */}
      {/*
      <div className="flex items-center justify-between w-full max-w-md px-4 pt-6 pb-2">
        <button>
          <ArrowLeftIcon className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-white text-lg font-bold tracking-widest">DASHBOARD</h1>
        <button>
          <Cog6ToothIcon className="w-6 h-6 text-white" />
        </button>
      </div>
      */}
      {/* Main content scaffold for further sections */}
      <main className="w-full max-w-md flex-1 flex flex-col items-center p-4">
        <div className="w-full max-w-md bg-gray-900 rounded-xl shadow-lg p-6 mt-8">
          <div className="flex flex-col items-center">
            <img
              src={athlete.image_url}
              alt={athlete.display_name}
              className="w-32 h-32 rounded-full object-cover border-4 border-blue-700 shadow-md mb-4"
            />
            <h1 className="text-2xl font-bold mb-1">{athlete.display_name}</h1>
            <p className="text-sm text-gray-400 mb-2">@{athlete.username}</p>
            <p className="text-lg font-semibold mb-2">{athlete.team} &mdash; {athlete.position}</p>
            <p className="text-sm text-gray-400 mb-2">{athlete.hometown}</p>
            <p className="text-center text-base mb-4">{athlete.bio}</p>
          </div>
          <div className="flex justify-between items-center bg-gray-800 rounded-lg p-4 mb-4">
            <div className="text-center">
              <div className="text-lg font-bold">${athlete.earnings.toFixed(2)}</div>
              <div className="text-xs text-gray-400">Earnings</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{athlete.view_count}</div>
              <div className="text-xs text-gray-400">Views</div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href={athlete.highlight_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 rounded-lg text-center transition"
            >
              Watch Highlight Video
            </a>
            <a
              href={athlete.spotify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg text-center transition"
            >
              Listen on Spotify
            </a>
            <a
              href="/settings"
              className="w-full bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2 rounded-lg text-center transition"
            >
              Edit Profile & Settings
            </a>
            <a
              href={`/locker/${athlete.username}`}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold py-2 rounded-lg text-center transition"
            >
              Preview Public Locker
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
