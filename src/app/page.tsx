import players from '@/data/bltz_mock_players.json';
import HeroHeader from '@/components/HeroHeader';
import { Card, CardHeader, CardBody, Image as HeroImage } from "@heroui/react";
import { ArrowLeftIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

const athlete = players[0]; // Simulate logged-in user

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white flex flex-col items-center">
      {/* Top Nav Bar */}
      <div className="flex items-center justify-between w-full px-4 pt-6 pb-[20px] sm:pt-8 sm:pb-6">
        <button>
          <ArrowLeftIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </button>
        <h1 className="text-white text-xl sm:text-2xl font-bold tracking-widest font-oswald uppercase text-center flex-1">
          DASHBOARD
        </h1>
        <button>
          <Cog6ToothIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
        </button>
      </div>
      {/* Welcome Message */}
      <div className="w-full max-w-md px-4 pb-2 text-left mb-[10px]">
        <div className="text-[12px] font-roboto font-medium">Welcome back,</div>
        <div className="text-[18px] font-roboto font-bold">{athlete.display_name}</div>
      </div>
      {/* Quote Box */}
      <div className="w-full max-w-md flex justify-center mb-2 px-4">
        <div className="px-4 py-3 text-center w-full font-roboto italic text-[12px] text-gray-300">
          &quot;Success is not owned, it&rsquo;s leased. And rent is due every day.&quot; &ndash; J.J. Watt
        </div>
      </div>
      {/* Hero Header */}
      <HeroHeader
        backgroundImage="/assets/Football_Background.png"
        cardImage="/assets/card_image.png"
        profileImage="/assets/NFLPlayer.png"
        alt={athlete.display_name}
      />
      {/* HeroUI Cards Row */}
      <div className="w-full max-w-md flex flex-row justify-center gap-4 mt-4">
        <Card className="w-[150px] h-[75px] rounded-xl flex flex-col justify-center items-center" style={{background: 'linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%)'}}>
          <CardHeader className="pb-0 pt-2 px-2 flex-col items-start">
            <p className="text-tiny uppercase font-bold">Daily Mix</p>
            <small className="text-default-500">12 Tracks</small>
            <h4 className="font-bold text-small">Frontend Radio</h4>
          </CardHeader>
        </Card>
        <Card className="w-[150px] h-[75px] rounded-xl flex flex-col justify-center items-center" style={{background: 'linear-gradient(90deg, #f59e42 0%, #fbbf24 100%)'}}>
          <CardHeader className="pb-0 pt-2 px-2 flex-col items-start">
            <p className="text-tiny uppercase font-bold">Stats</p>
            <small className="text-default-500">Views</small>
            <h4 className="font-bold text-small">1,234</h4>
          </CardHeader>
        </Card>
      </div>
      {/* Main content scaffold for further sections */}
      <main className="w-full max-w-md flex-1 flex flex-col items-center p-4">
        <div className="w-full max-w-md bg-gray-900 rounded-xl shadow-lg p-6 mt-8">
          <div className="flex flex-col items-center">
            <HeroImage
              src={athlete.image_url}
              alt={athlete.display_name}
              width={128}
              height={128}
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
