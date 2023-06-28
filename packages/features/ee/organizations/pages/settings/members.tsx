import { useRouter } from "next/router";
import { useState } from "react";
import { shallow } from "zustand/shallow";

import MemberInvitationModal from "@calcom/features/ee/teams/components/MemberInvitationModal";
import TeamInviteList from "@calcom/features/ee/teams/components/TeamInviteList";
import { getLayout } from "@calcom/features/settings/layouts/SettingsLayout";
import { UserListTable } from "@calcom/features/users/components/UserTable/UserListTable";
import {
  useInitializeOrgMemberStore,
  useOrgMemberStore,
} from "@calcom/features/users/components/UserTable/store";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button, Meta, showToast } from "@calcom/ui";
import { Plus } from "@calcom/ui/components/icon";

type Team = RouterOutputs["viewer"]["teams"]["get"];

interface MembersListProps {
  team: Team | undefined;
}

const checkIfExist = (comp: string, query: string) =>
  comp.toLowerCase().replace(/\s+/g, "").includes(query.toLowerCase().replace(/\s+/g, ""));

// function MembersList(props: MembersListProps) {
//   const { team } = props;
//   const { t } = useLocale();
//   const [query, setQuery] = useState<string>("");

//   const members = team?.members;
//   const membersList = members
//     ? members && query === ""
//       ? members
//       : members.filter((member) => {
//           const email = member.email ? checkIfExist(member.email, query) : false;
//           const username = member.username ? checkIfExist(member.username, query) : false;
//           const name = member.name ? checkIfExist(member.name, query) : false;

//           return email || username || name;
//         })
//     : undefined;

//   return (
//     <div className="flex flex-col gap-y-3">
//       <TextField
//         type="search"
//         autoComplete="false"
//         onChange={(e) => setQuery(e.target.value)}
//         value={query}
//         placeholder={`${t("search")}...`}
//       />
//       {membersList?.length && team ? (
//         <ul className="divide-subtle border-subtle divide-y rounded-md border ">
//           {membersList.map((member) => {
//             return <MemberListItem key={member.id} team={team} member={member} />;
//           })}
//         </ul>
//       ) : null}
//     </div>
//   );
// }

const MembersView = () => {
  const { t, i18n } = useLocale();
  useInitializeOrgMemberStore();
  const [team, isLoading] = useOrgMemberStore((state) => [state.currentTeam, state.isLoading], shallow);
  const membershipPermissions = useOrgMemberStore((state) => state.permissions);

  const router = useRouter();
  const utils = trpc.useContext();
  const showDialog = router.query.inviteModal === "true";
  const [showMemberInvitationModal, setShowMemberInvitationModal] = useState(showDialog);

  const inviteMemberMutation = trpc.viewer.teams.inviteMember.useMutation({
    async onSuccess(data) {
      await utils.viewer.organizations.listMembers.invalidate();
      setShowMemberInvitationModal(false);
      if (data.sendEmailInvitation) {
        if (Array.isArray(data.usernameOrEmail)) {
          showToast(
            t("email_invite_team_bulk", {
              userCount: data.usernameOrEmail.length,
            }),
            "success"
          );
        } else {
          showToast(
            t("email_invite_team", {
              email: data.usernameOrEmail,
            }),
            "success"
          );
        }
      }
    },
    onError: (error) => {
      showToast(error.message, "error");
    },
  });

  const isInviteOpen = !team?.membership.accepted;

  return (
    <>
      <Meta
        title={t("organization_members")}
        description={t("organization_description")}
        CTA={
          membershipPermissions.isAdminOrOwner ? (
            <Button
              type="button"
              color="primary"
              StartIcon={Plus}
              className="ml-auto"
              onClick={() => setShowMemberInvitationModal(true)}
              data-testid="new-organization-member-button">
              {t("add")}
            </Button>
          ) : (
            <></>
          )
        }
      />
      {!isLoading && (
        <>
          <div>
            {team && (
              <>
                {isInviteOpen && (
                  <TeamInviteList
                    teams={[
                      {
                        id: team.id,
                        accepted: team.membership.accepted || false,
                        logo: team.logo,
                        name: team.name,
                        slug: team.slug,
                        role: team.membership.role,
                      },
                    ]}
                  />
                )}
              </>
            )}
            <UserListTable
              users={[
                {
                  id: "1",
                  email: "test@test.com",
                  username: "test",
                  role: "ADMIN",
                  timezone: "America/Los_Angeles",
                  teams: [
                    {
                      id: "1",
                      name: "test",
                      role: "ADMIN",
                      slug: "test",
                    },
                  ],
                },
              ]}
            />
          </div>
          {showMemberInvitationModal && team && (
            <MemberInvitationModal
              teamId={team.id}
              isOpen={showMemberInvitationModal}
              members={team.members}
              onExit={() => setShowMemberInvitationModal(false)}
              onSubmit={(values) => {
                inviteMemberMutation.mutate({
                  teamId: team.id,
                  language: i18n.language,
                  role: values.role,
                  usernameOrEmail: values.emailOrUsername,
                  sendEmailInvitation: values.sendInviteEmail,
                  isOrg: true,
                });
              }}
            />
          )}
        </>
      )}
    </>
  );
};
MembersView.getLayout = getLayout;

export default MembersView;
