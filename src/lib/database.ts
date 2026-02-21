import { supabase } from './supabase';

// ============================================
// Auth / Profiles
// ============================================

export async function signupUser(nickname: string, password: string) {
    const { data, error } = await supabase
        .from('profiles')
        .insert({ nickname, password })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function loginUser(nickname: string, password: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('nickname', nickname)
        .eq('password', password)
        .single();
    if (error) return null;
    return data;
}

export async function getAllUserNames(): Promise<string[]> {
    const { data } = await supabase.from('profiles').select('nickname');
    return (data || []).map((p: any) => p.nickname);
}

export async function getAllUserProfiles() {
    const { data } = await supabase
        .from('profiles')
        .select('nickname, profile_pic, status_message, group_members(groups(name))');
    return (data || []).map((p: any) => ({
        userName: p.nickname,
        profilePic: p.profile_pic,
        statusMessage: p.status_message,
        groups: (p.group_members || []).map((gm: any) => gm.groups?.name).filter(Boolean)
    }));
}

export async function updateProfile(profileId: string, updates: Record<string, any>) {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function getFullProfile(profileId: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
    if (error) return null;
    return data;
}

// ============================================
// Groups
// ============================================

export async function createGroup(name: string, leaderId: string, inviteCode: string) {
    const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({ name, leader_id: leaderId, invite_code: inviteCode })
        .select()
        .single();
    if (groupError) throw groupError;

    // Add leader as group member
    await supabase.from('group_members').insert({
        group_id: group.id,
        profile_id: leaderId,
        role: 'leader'
    });

    return group;
}

export async function getGroupByInviteCode(code: string) {
    const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('invite_code', code)
        .single();
    if (error) return null;
    return data;
}

export async function getGroupById(id: string) {
    const { data } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single();
    return data;
}

export async function getMyGroups(profileId: string) {
    const { data } = await supabase
        .from('group_members')
        .select('group_id, role, groups(*)')
        .eq('profile_id', profileId);
    return (data || []).map((gm: any) => ({
        ...gm.groups,
        myRole: gm.role
    }));
}

export async function joinGroup(groupId: string, profileId: string) {
    const { error } = await supabase.from('group_members').insert({
        group_id: groupId,
        profile_id: profileId,
        role: 'member'
    });
    if (error) throw error;
}

export async function leaveGroup(groupId: string, profileId: string) {
    // Remove from group_members
    await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('profile_id', profileId);

    // Remove from any teams in this group
    const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('group_id', groupId);

    if (teams && teams.length > 0) {
        const teamIds = teams.map((t: any) => t.id);
        await supabase
            .from('team_members')
            .delete()
            .eq('profile_id', profileId)
            .in('team_id', teamIds);
    }
}

export async function deleteGroup(groupId: string) {
    // CASCADE will handle group_members, teams, team_members, missions
    const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);
    if (error) throw error;
}

export async function getGroupMembers(groupId: string) {
    const { data } = await supabase
        .from('group_members')
        .select('profile_id, role, profiles(id, nickname, profile_pic, pbs)')
        .eq('group_id', groupId);
    return (data || []).map((gm: any) => ({
        profileId: gm.profile_id,
        role: gm.role,
        ...gm.profiles
    }));
}

// ============================================
// Teams
// ============================================

export async function getTeamsByGroup(groupId: string) {
    const { data: teams } = await supabase
        .from('teams')
        .select('*, team_members(profile_id, profiles(nickname))')
        .eq('group_id', groupId);

    return (teams || []).map((t: any) => ({
        id: t.id,
        groupId: t.group_id,
        name: t.name,
        bonusPoints: t.bonus_points || 0,
        members: (t.team_members || []).map((tm: any) => tm.profiles?.nickname).filter(Boolean)
    }));
}

export async function updateTeamPoints(teamId: string, bonusPoints: number) {
    await supabase.from('teams').update({ bonus_points: bonusPoints }).eq('id', teamId);
}


export async function createTeam(groupId: string, name: string) {
    const { data, error } = await supabase
        .from('teams')
        .insert({ group_id: groupId, name })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function renameTeam(teamId: string, name: string) {
    await supabase.from('teams').update({ name }).eq('id', teamId);
}

export async function deleteTeam(teamId: string) {
    await supabase.from('teams').delete().eq('id', teamId);
}

export async function addTeamMember(teamId: string, profileId: string) {
    await supabase.from('team_members').insert({ team_id: teamId, profile_id: profileId });
}

export async function removeTeamMember(teamId: string, profileId: string) {
    await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('profile_id', profileId);
}

export async function getProfileByNickname(nickname: string) {
    const { data } = await supabase
        .from('profiles')
        .select('id, nickname')
        .eq('nickname', nickname)
        .single();
    return data;
}

// ============================================
// Missions
// ============================================

export async function getMissionsByGroup(groupId: string) {
    const { data } = await supabase
        .from('missions')
        .select('*, comments(*)')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

    return (data || []).map((m: any) => ({
        id: m.id,
        groupId: m.group_id,
        teamId: m.team_id,
        profileId: m.profile_id,
        userName: m.user_name,
        week: m.week,
        type: m.type,
        status: m.status,
        records: m.records || {},
        distance: Number(m.distance) || 0,
        images: m.images || [],
        likedBy: m.liked_by || [],
        timestamp: m.created_at,
        comments: (m.comments || []).map((c: any) => ({
            id: c.id,
            userName: c.user_name,
            text: c.text,
            timestamp: c.created_at
        }))
    }));
}

export async function getAllMissions() {
    const { data } = await supabase
        .from('missions')
        .select('*, comments(*)')
        .order('created_at', { ascending: false });

    return (data || []).map((m: any) => ({
        id: m.id,
        groupId: m.group_id,
        teamId: m.team_id,
        profileId: m.profile_id,
        userName: m.user_name,
        week: m.week,
        type: m.type,
        status: m.status,
        records: m.records || {},
        distance: Number(m.distance) || 0,
        images: m.images || [],
        likedBy: m.liked_by || [],
        timestamp: m.created_at,
        comments: (m.comments || []).map((c: any) => ({
            id: c.id,
            userName: c.user_name,
            text: c.text,
            timestamp: c.created_at
        }))
    }));
}

export async function getIndividualMissions(profileId: string) {
    const { data } = await supabase
        .from('missions')
        .select('*, comments(*)')
        .eq('profile_id', profileId)
        .is('group_id', null)
        .order('created_at', { ascending: false });

    return (data || []).map((m: any) => ({
        id: m.id,
        groupId: m.group_id,
        teamId: m.team_id,
        profileId: m.profile_id,
        userName: m.user_name,
        week: m.week,
        type: m.type,
        status: m.status,
        records: m.records || {},
        distance: Number(m.distance) || 0,
        images: m.images || [],
        likedBy: m.liked_by || [],
        timestamp: m.created_at,
        comments: (m.comments || []).map((c: any) => ({
            id: c.id,
            userName: c.user_name,
            text: c.text,
            timestamp: c.created_at
        }))
    }));
}

export async function submitMission(mission: {
    groupId?: string | null;
    teamId?: string | null;
    profileId: string;
    userName: string;
    week: number;
    type: string;
    status?: string;
    records?: Record<string, string>;
    distance?: number;
    images?: string[];
}) {
    const { data, error } = await supabase
        .from('missions')
        .insert({
            group_id: mission.groupId || null,
            team_id: mission.teamId || null,
            profile_id: mission.profileId,
            user_name: mission.userName,
            week: mission.week,
            type: mission.type,
            status: mission.status || (mission.groupId ? 'pending' : 'none'),
            records: mission.records || {},
            distance: mission.distance || 0,
            images: mission.images || []
        })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function approveMission(missionId: string) {
    await supabase
        .from('missions')
        .update({ status: 'approved' })
        .eq('id', missionId);
}

export async function deleteMission(missionId: string) {
    await supabase.from('missions').delete().eq('id', missionId);
}

export async function toggleLike(missionId: string, userName: string) {
    // Get current liked_by
    const { data: mission } = await supabase
        .from('missions')
        .select('liked_by')
        .eq('id', missionId)
        .single();

    if (!mission) return;

    const likedBy: string[] = mission.liked_by || [];
    const newLikedBy = likedBy.includes(userName)
        ? likedBy.filter((n: string) => n !== userName)
        : [...likedBy, userName];

    await supabase
        .from('missions')
        .update({ liked_by: newLikedBy })
        .eq('id', missionId);
}

// ============================================
// Comments
// ============================================

export async function addComment(missionId: string, profileId: string, userName: string, text: string) {
    const { data, error } = await supabase
        .from('comments')
        .insert({ mission_id: missionId, profile_id: profileId, user_name: userName, text })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function deleteComment(commentId: string) {
    await supabase.from('comments').delete().eq('id', commentId);
}

// ============================================
// Challenges
// ============================================

export async function getChallenges() {
    const { data } = await supabase
        .from('challenges')
        .select('*')
        .order('week', { ascending: true });

    return (data || []).map((c: any) => ({
        id: c.id,
        week: c.week,
        title: c.title,
        description: c.description,
        recordFields: c.record_fields || []
    }));
}

export async function addChallengeDB(week: number, title: string, description: string, recordFields?: any[]) {
    const { data, error } = await supabase
        .from('challenges')
        .insert({ week, title, description, record_fields: recordFields || [] })
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateChallengeDB(id: string, title: string, description: string, recordFields?: any[]) {
    const updates: any = { title, description };
    if (recordFields) updates.record_fields = recordFields;
    await supabase.from('challenges').update(updates).eq('id', id);
}

export async function deleteChallengeDB(id: string) {
    await supabase.from('challenges').delete().eq('id', id);
}

// ============================================
// Kick Member
// ============================================

export async function kickMemberFromGroup(groupId: string, profileId: string) {
    // Remove from group_members
    await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('profile_id', profileId);

    // Remove from all teams in this group
    const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('group_id', groupId);

    if (teams && teams.length > 0) {
        const teamIds = teams.map((t: any) => t.id);
        await supabase
            .from('team_members')
            .delete()
            .eq('profile_id', profileId)
            .in('team_id', teamIds);
    }
}

// ============================================
// Storage
// ============================================

export async function uploadFile(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('missions')
        .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
        .from('missions')
        .getPublicUrl(filePath);

    return data.publicUrl;
}

export async function getAllGroups() {
    const { data } = await supabase.from('groups').select('*');
    return (data || []).map((g: any) => ({
        id: g.id,
        name: g.name,
        leaderId: g.leader_id,
        inviteCode: g.invite_code,
        totalScore: g.total_score || 0,
        totalDistance: Number(g.total_distance) || 0
    }));
}

export async function getAllGroupMembers() {
    const { data } = await supabase
        .from('group_members')
        .select('group_id, profiles(nickname, profile_pic, status_message)');
    return (data || []).map((gm: any) => ({
        groupId: gm.group_id,
        userName: gm.profiles?.nickname,
        profilePic: gm.profiles?.profile_pic,
        statusMessage: gm.profiles?.status_message
    })).filter(gm => gm.userName);
}
