import players from '@/data/bltz_mock_players.json';
import HeroHeader from '@/components/HeroHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { TrendingUp } from "lucide-react";

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
      {/* Shadcn Section Card */}
      <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <Card className="@container/card">
          <CardHeader>
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
              $1,250.00
            </CardTitle>
            <Badge variant="outline">
              <TrendingUp className="size-4" />
              +12.5%
            </Badge>
          </CardHeader>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              Trending up this month <TrendingUp className="size-4" />
            </div>
            <div className="text-muted-foreground">
              Visitors for the last 6 months
            </div>
          </CardFooter>
        </Card>
      </div>
      {/* Main content scaffold for further sections */}
      <main className="w-full max-w-md flex-1 flex flex-col items-center p-4">
        {/* Add more dashboard sections here */}
      </main>
    </div>
  );
}
