import { prisma } from './client.js';

const HACK_CLUB_CHECK_URL = 'https://auth.hackclub.com/api/external/check';

type HackClubCheckResult =
  | 'needs_submission'
  | 'pending'
  | 'verified_eligible'
  | 'verified_but_over_18'
  | 'rejected'
  | 'not_found';

type HackClubCheckResponse = {
  result: HackClubCheckResult;
};

async function fetchVerificationResult(user: {
  id: string;
  email: string | null;
  slack_id: string;
}) {
  const query = new URLSearchParams();

  if (user.email) {
    query.set('email', user.email);
  } else {
    query.set('slack_id', user.slack_id);
  }

  const response = await fetch(`${HACK_CLUB_CHECK_URL}?${query.toString()}`);
  if (!response.ok) {
    throw new Error(`Hack Club check failed for user ${user.id}: ${response.status}`);
  }

  return (await response.json()) as HackClubCheckResponse;
}

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      slack_id: true,
    },
    orderBy: {
      id: 'asc',
    },
  });

  if (users.length === 0) {
    console.log('No users found.');
    return;
  }

  let updatedCount = 0;

  for (const user of users) {
    if (!user.email && !user.slack_id) {
      console.warn(`Skipping user ${user.id}: no email or Slack ID available.`);
      continue;
    }

    try {
      const result = await fetchVerificationResult(user);

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          hackClubVerificationResult: result.result,
          hackClubVerificationCheckedAt: new Date(),
        },
      });

      updatedCount += 1;
      console.log(`Updated ${user.id} (${user.email ?? user.slack_id}) -> ${result.result}`);
    } catch (error) {
      console.error(`Failed to update ${user.id}:`, error);
    }
  }

  console.log(`Finished updating ${updatedCount} of ${users.length} users.`);
}

main()
  .catch((error) => {
    console.error('Failed to populate Hack Club verification data:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
