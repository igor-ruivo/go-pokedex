import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { CustomLeaguePicker } from '../components/CustomLeaguePicker';
import { IconTabBar, type IconTabItem } from '../components/IconTabBar';
import { LeaguePicker, type LeaguePickerItem } from '../components/LeaguePicker';
import { RankMedal } from '../components/RankMedal';
import { useLanguage } from '../contexts/language-context';
import { isStaticLeague } from '../DTOs/ILeagueDefinition';
import { isTeamLeague, type RankedTeam, TEAM_LEAGUES, type TeamLeague } from '../DTOs/ITeamBuilder';
import { LEAGUE_CP } from '../lib/league-caps';
import { leagueIcon } from '../lib/league-visuals';
import { modeColor, modeLabel, modeLabelLong, R } from '../lib/nav';
import { encodeTeam, letterGrade, type ScoreParts, scoreTier, teamScore, threatPart } from '../lib/team-analysis';
import { useLeagueDefinitions } from '../queries/leagues';
import { useGameTranslationsData } from '../utils/game-translations-store';
import { BattlePlan } from './teams/BattlePlan';
import { CoveragePanel } from './teams/CoveragePanel';
import { FavoriteStar } from './teams/FavoriteStar';
import { FavoriteTeams } from './teams/FavoriteTeams';
import { PokemonCollection } from './teams/PokemonCollection';
import { ScoreHero } from './teams/ScoreHero';
import { StatsPanel } from './teams/StatsPanel';
import { Suggestions } from './teams/Suggestions';
import { lastTeamLeague } from './teams/team-memory';
import { TeamMini } from './teams/TeamMini';
import { SlotPicker, TeamStage } from './teams/TeamStage';
import { ThreatPanel } from './teams/ThreatPanel';
import { TopTeams } from './teams/TopTeams';
import { TypeProfile } from './teams/TypeProfile';
import { useTeamAnalysis } from './teams/useTeamAnalysis';
import { completeTeam, useSimContext, useTeamEvaluation, useTeamsData, useTeamSuggestions } from './teams/useTeamsData';
import { useTeamState } from './teams/useTeamState';
import { pickToSlot, useTeamUpgrades } from './teams/useTeamUpgrades';
import { Warnings } from './teams/Warnings';

const LEAGUE_ICON_FALLBACK: Record<TeamLeague, string> = {
	great: '/images/leagues/cups/pogo_great_league.png',
	ultra: '/images/leagues/cups/pogo_ultra_league.png',
	master: '/images/leagues/cups/pogo_master_league.png',
};

const Teams = () => {
	const { t } = useTranslation(['teams', 'common']);
	const { currentGameLanguage: gl } = useLanguage();
	const [params, setParams] = useSearchParams();
	const navigate = useNavigate();
	// Views of the same page: the builder, ranked teams, favorites, and the user's league collection.
	const { pathname } = useLocation();
	const tab: 'builder' | 'top' | 'favorites' | 'collection' = pathname.endsWith('/top')
		? 'top'
		: pathname.endsWith('/favorites')
			? 'favorites'
			: pathname.endsWith('/collection')
				? 'collection'
				: 'builder';
	const gameTranslations = useGameTranslationsData();

	const leagueParam = params.get('league');
	// Without a league in the URL, the one visited last in this session (see team-memory.ts).
	const [rememberedLeague] = useState(lastTeamLeague);
	// The permanent leagues, or a rotating / custom cup that is active right now (`leagues.json`). A cup's id can only be
	// checked once that file has loaded; until then the page waits (below) instead of flashing Great League.
	const { leagues, fetchCompleted: leaguesLoaded } = useLeagueDefinitions();
	const wanted = isTeamLeague(leagueParam) ? leagueParam : rememberedLeague;
	const leaguePending = !!wanted && !leaguesLoaded && !isStaticLeague(wanted);
	const league: TeamLeague =
		wanted && (isStaticLeague(wanted) || leagues.some((l) => l.id === wanted)) ? wanted : 'great';

	const data = useTeamsData(league);
	const ctx = useSimContext(league, data);
	const { team, setMember, setMove, setBuild, removeMember, replaceTeam, recommendedMoveset, restoring } = useTeamState(
		data,
		league,
		tab === 'builder'
	);
	const analysis = useTeamAnalysis(league, ctx, data, team);

	const full = team.length === 3;
	const evaluationQuery = useTeamEvaluation(league, data, team);
	const evaluation = full ? evaluationQuery.data : undefined;
	const simulating = full && evaluationQuery.isFetching && !evaluationQuery.data;
	const stale = full && evaluationQuery.isPlaceholderData;

	// Upgrades are looked for automatically, but only after the rating is in — both share one worker.
	const suggestionsQuery = useTeamSuggestions(
		league,
		data,
		team,
		evaluationQuery.isSuccess && !evaluationQuery.isFetching
	);

	const [copied, setCopied] = useState(false);

	// "Suggestion" on a team of one or two: work out the best teammates and put them in the empty slots.
	const [suggesting, setSuggesting] = useState(false);
	const teamKeyRef = useRef('');
	teamKeyRef.current = encodeTeam(team);
	const suggestTeammates = async () => {
		if (suggesting || !ctx || team.length < 1 || team.length > 2) return;
		const startedWith = encodeTeam(team);
		setSuggesting(true);
		try {
			const completed = await completeTeam(league, data, ctx, team);
			// Only if the team is still the one the suggestion was asked for.
			if (completed && teamKeyRef.current === startedWith) replaceTeam(completed);
		} finally {
			setSuggesting(false);
		}
	};
	// Which team slot the Pokémon picker is open for — set from a team card or from a Battle plan step.
	const [pickerFor, setPickerFor] = useState<number | null>(null);

	const parts: ScoreParts | undefined = useMemo(
		() =>
			analysis && full
				? {
						threat: evaluation ? threatPart(evaluation.threatScore) : undefined,
						defense: analysis.defense.score,
						offense: analysis.offense.score,
						bulk: analysis.grades.bulk.part,
						safety: analysis.grades.safety.part,
						consistency: analysis.grades.consistency.part,
					}
				: undefined,
		[analysis, evaluation, full]
	);
	const score = parts ? teamScore(parts) : undefined;
	const tier = score === undefined ? undefined : scoreTier(score);
	const upgrades = useTeamUpgrades(league, ctx, data, team, suggestionsQuery.data, score);

	// League labels come from the in-game translations (same source as the Rankings picker).
	const leagueItems: Array<LeaguePickerItem> = useMemo(
		() =>
			TEAM_LEAGUES.map((id) => ({
				id,
				label: modeLabel(id, gl, []),
				icon: leagueIcon(id) ?? LEAGUE_ICON_FALLBACK[id],
				color: modeColor(id),
			})),
		// `gameTranslations` isn't read directly — it's what tells this memo the translator data changed.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[gl, gameTranslations]
	);

	const setLeague = (id: string) => {
		if (!isTeamLeague(id)) return;
		const next = new URLSearchParams(params);
		next.set('league', id);
		setParams(next, { replace: true });
	};

	/** Puts every Pokémon back on PvPoke's recommended moveset for this league. */
	/** Puts every Pokémon back on PvPoke's recommended moveset, the league's best IVs and the level the CP cap allows. */
	const reset = () =>
		replaceTeam(team.map((slot) => ({ speciesId: slot.speciesId, moveset: recommendedMoveset(slot.speciesId) })));
	// Anything to reset: picked IVs, or a moveset other than the recommended one (the Charged Moves in either order).
	const modified = team.some((slot) => {
		const recommended = recommendedMoveset(slot.speciesId);
		const sameCharged = [...slot.moveset.slice(1)].sort().join() === [...recommended.slice(1)].sort().join();
		return !!slot.ivs || slot.level !== undefined || slot.moveset[0] !== recommended[0] || !sameCharged;
	});

	const copyLink = async () => {
		await navigator.clipboard?.writeText(window.location.href);
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1800);
	};

	const tabItems: Array<IconTabItem> = [
		{ id: 'builder', label: t('teams:page.builderTab'), icon: '/images/nav/rankings.webp' },
		{
			id: 'top',
			label: t('teams:page.topTab'),
			// a gold medal: the best teams
			icon: <RankMedal rank={1} size={22} />,
		},
		{
			id: 'collection',
			label: t('teams:page.collectionTab'),
			// a trainer's schoolbag (Ash's kind of backpack): the Pokémon you carry
			icon: (
				<svg viewBox='0 0 24 24' width='18' height='18' aria-hidden='true'>
					{/* carrying handle */}
					<path
						d='M9.2 5.2V4.4a2.8 2.8 0 0 1 5.6 0v.8'
						fill='none'
						stroke='#c9741a'
						strokeWidth='1.7'
						strokeLinecap='round'
					/>
					{/* the bag */}
					<path
						d='M5.2 9.2A4.2 4.2 0 0 1 9.4 5h5.2a4.2 4.2 0 0 1 4.2 4.2V19a2 2 0 0 1-2 2H7.2a2 2 0 0 1-2-2z'
						fill='#f2b134'
					/>
					{/* top flap */}
					<path d='M5.2 9.2A4.2 4.2 0 0 1 9.4 5h5.2a4.2 4.2 0 0 1 4.2 4.2v1.3H5.2z' fill='#e0861c' />
					{/* front pocket */}
					<path
						d='M7.4 13.6h9.2a1 1 0 0 1 1 1V18a1.6 1.6 0 0 1-1.6 1.6H8A1.6 1.6 0 0 1 6.4 18v-3.4a1 1 0 0 1 1-1z'
						fill='#f9d36d'
					/>
					{/* clasp and zip */}
					<rect x='10.9' y='9' width='2.2' height='3' rx='0.7' fill='#7a3f0c' />
					<path d='M8.6 16.4h6.8' stroke='#c9741a' strokeWidth='1.2' strokeLinecap='round' />
				</svg>
			),
		},
		{
			id: 'favorites',
			label: t('teams:page.favoritesTab'),
			icon: (
				<svg viewBox='2.3 2.2 19.4 18.4' width='18' height='18' fill='#f2c53d' aria-hidden='true'>
					<path d='M12 2.4l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.3l-5.9 3.1 1.2-6.5L2.5 9.3l6.6-.9z' />
				</svg>
			),
		},
	];

	// Switching tabs keeps the league; a team only travels with a click on the list.
	const goToTab = (id: string) => {
		const next = new URLSearchParams();
		next.set('league', league);
		void navigate({
			pathname:
				id === 'top'
					? R.teamsTop
					: id === 'favorites'
						? R.teamsFavorites
						: id === 'collection'
							? R.teamsCollection
							: R.teams,
			search: `?${next.toString()}`,
		});
	};

	const openFromTop = (team: RankedTeam) => {
		const next = new URLSearchParams();
		next.set('league', league);
		next.set('t', encodeTeam(team.members));
		void navigate({ pathname: R.teams, search: `?${next.toString()}` });
	};

	const leagueLabel = modeLabelLong(league, gl, leagues);
	const accent = modeColor(league);
	const verified = data.builder?.simulator.verified ?? true;

	// A cup's id from the link or the last visit: wait for the league list to confirm it (and give its CP cap) first.
	if (leaguePending) {
		return (
			<div className='r-shell r-tm'>
				<div className='r-tm-loading'>
					<span className='r-spinner' aria-hidden='true' />
					<p>{t('teams:page.loading')}</p>
				</div>
			</div>
		);
	}

	return (
		<div
			className={
				tab === 'top' || tab === 'favorites' || tab === 'collection' ? 'r-shell r-tm' : 'r-shell r-shell--wide r-tm'
			}
			data-tab={tab}
		>
			<h1 className='r-page-title'>{t('teams:page.title')}</h1>

			<IconTabBar items={tabItems} activeId={tab} onSelect={goToTab} ariaLabel={t('teams:page.tabsAria')} />

			<div className='r-league-row r-tm-leagues'>
				<LeaguePicker
					items={leagueItems}
					activeId={league}
					onSelect={setLeague}
					ariaLabel={t('teams:page.leagueAria')}
					trailing={<CustomLeaguePicker activeId={league} onSelect={setLeague} />}
				/>
			</div>

			{data.failed && <p className='r-muted'>{t('teams:page.loadFailed')}</p>}
			{!data.failed && !data.ready && (
				<div className='r-tm-loading'>
					<span className='r-spinner' aria-hidden='true' />
					<p>{t('teams:page.loading')}</p>
				</div>
			)}

			{data.ready && tab === 'top' && <TopTeams league={league} data={data} onOpen={openFromTop} />}

			{data.ready && tab === 'favorites' && <FavoriteTeams league={league} data={data} onOpen={openFromTop} />}

			{data.ready && tab === 'collection' && (
				<PokemonCollection key={league} league={league} leagueLabel={leagueLabel} data={data} onOpen={openFromTop} />
			)}

			{data.ready && tab === 'builder' && restoring && (
				<div className='r-tm-loading'>
					<span className='r-spinner' aria-hidden='true' />
					<p>{t('teams:page.loading')}</p>
				</div>
			)}

			{data.ready && tab === 'builder' && !restoring && (
				<>
					<p className='r-tm-intro'>{t('teams:builder.intro', { league: leagueLabel })}</p>

					{!verified && (
						<p className='r-tm-banner' role='status'>
							{t('teams:builder.unverified')}
						</p>
					)}

					<TeamStage
						data={data}
						team={team}
						members={analysis?.members ?? []}
						roleOf={(i) => {
							const roles = analysis?.roles;
							if (!roles) return undefined;
							return (['lead', 'switch', 'closer'] as const).find((r) => roles.order[r] === i);
						}}
						onChangePokemon={setPickerFor}
						onMove={setMove}
						onBuild={setBuild}
						cpCap={LEAGUE_CP[league]}
						onRemove={removeMember}
						onSuggest={() => void suggestTeammates()}
						suggesting={suggesting}
					/>
					{pickerFor !== null && (
						<SlotPicker
							leagueLabel={leagueLabel}
							data={data}
							team={team}
							slot={pickerFor}
							onSetMember={setMember}
							onClose={() => setPickerFor(null)}
						/>
					)}

					{analysis && parts && full && (
						<TeamMini
							members={analysis.members}
							score={score}
							tier={tier}
							threatScore={evaluation?.threatScore}
							grades={{
								coverage: evaluation ? letterGrade(1200 - evaluation.threatScore, 680) : undefined,
								bulk: analysis.grades.bulk.grade,
								safety: analysis.grades.safety.grade,
								consistency: analysis.grades.consistency.grade,
							}}
							loading={simulating || stale}
							onChangePokemon={setPickerFor}
						/>
					)}

					{full && (
						<div className='r-tm-actions'>
							<FavoriteStar league={league} members={team} data={data} />
							<button type='button' className='r-tm-btn r-tm-btn--ghost' onClick={() => void copyLink()}>
								{copied ? t('teams:builder.copied') : t('teams:builder.copyLink')}
							</button>
							<button type='button' className='r-tm-btn r-tm-btn--ghost' onClick={() => replaceTeam([])}>
								{t('teams:builder.clear')}
							</button>
							<button type='button' className='r-tm-btn r-tm-btn--ghost' disabled={!modified} onClick={reset}>
								{t('teams:builder.reset')}
							</button>
						</div>
					)}

					{team.length === 0 && <p className='r-tm-empty'>{t('teams:builder.emptyHint')}</p>}
					{team.length > 0 && !full && (
						<p className='r-tm-empty'>{t('teams:builder.addMore', { n: 3 - team.length })}</p>
					)}

					{analysis && parts && full && (
						<>
							<ScoreHero
								score={score}
								tier={tier}
								parts={parts}
								simulating={simulating}
								stale={stale}
								accent={accent}
							/>

							<h2 className='r-section-h'>{t('teams:plan.heading')}</h2>
							<BattlePlan members={analysis.members} roles={analysis.roles} onChangePokemon={setPickerFor} />

							<h2 className='r-section-h'>{t('teams:threat.heading')}</h2>
							<div className='r-tm-duo'>
								<ThreatPanel
									evaluation={evaluation}
									members={analysis.members}
									gamemaster={data.gamemaster}
									stale={stale}
									loading={simulating}
									onChangePokemon={setPickerFor}
								/>
								{evaluation ? (
									<CoveragePanel
										evaluation={evaluation}
										members={analysis.members}
										gamemaster={data.gamemaster}
										stale={stale}
										onChangePokemon={setPickerFor}
									/>
								) : (
									<div className='r-tm-panel r-tm-loading'>
										<span className='r-spinner' aria-hidden='true' />
									</div>
								)}
							</div>
						</>
					)}

					{analysis && full && (
						<>
							<h2 className='r-section-h'>{t('teams:typing.heading')}</h2>
							<TypeProfile
								members={analysis.members}
								defense={analysis.defense}
								offense={analysis.offense}
								onChangePokemon={setPickerFor}
							/>

							<h2 className='r-section-h'>{t('teams:stats.heading')}</h2>
							<StatsPanel league={league} analysis={analysis} threatScore={evaluation?.threatScore} />

							<h2 className='r-section-h'>{t('teams:warnings.heading')}</h2>
							<Warnings warnings={analysis.warnings} members={analysis.members} />
						</>
					)}

					{analysis && full && (
						<>
							<h2 className='r-section-h'>{t('teams:suggest.heading')}</h2>
							<Suggestions
								members={analysis.members}
								gamemaster={data.gamemaster}
								loading={!suggestionsQuery.data && !suggestionsQuery.isError}
								failed={suggestionsQuery.isError}
								upgrades={upgrades}
								onApply={(pick) =>
									// a Super Max Mega comes with its build for level 52; anyone else just takes the slot with the usual defaults
									pick.superMega
										? replaceTeam(team.map((slot, i) => (i === pick.slot ? pickToSlot(pick) : slot)))
										: setMember(pick.slot, pick.speciesId)
								}
							/>
						</>
					)}
				</>
			)}
		</div>
	);
};

export default Teams;
