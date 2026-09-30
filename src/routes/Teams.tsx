import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { IconTabBar, type IconTabItem } from '../components/IconTabBar';
import { LeaguePicker, type LeaguePickerItem } from '../components/LeaguePicker';
import { useLanguage } from '../contexts/language-context';
import { isTeamLeague, type RankedTeam, TEAM_LEAGUES, type TeamLeague } from '../DTOs/ITeamBuilder';
import { leagueIcon } from '../lib/league-visuals';
import { modeColor, modeLabel, modeLabelLong, R } from '../lib/nav';
import { encodeTeam, letterGrade, type ScoreParts, scoreTier, teamScore, threatPart } from '../lib/team-analysis';
import { useGameTranslationsData } from '../utils/game-translations-store';
import { BattlePlan } from './teams/BattlePlan';
import { CoveragePanel } from './teams/CoveragePanel';
import { ScoreHero } from './teams/ScoreHero';
import { StatsPanel } from './teams/StatsPanel';
import { Suggestions } from './teams/Suggestions';
import { TeamMini } from './teams/TeamMini';
import { SlotPicker, TeamStage } from './teams/TeamStage';
import { ThreatPanel } from './teams/ThreatPanel';
import { TopTeams } from './teams/TopTeams';
import { TypeProfile } from './teams/TypeProfile';
import { useTeamAnalysis } from './teams/useTeamAnalysis';
import { useSimContext, useTeamEvaluation, useTeamsData, useTeamSuggestions } from './teams/useTeamsData';
import { useTeamState } from './teams/useTeamState';
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
	// Two views of the same page: the builder, and the best teams we could find.
	const tab: 'builder' | 'top' = useLocation().pathname.endsWith('/top') ? 'top' : 'builder';
	const gameTranslations = useGameTranslationsData();

	const leagueParam = params.get('league');
	const league: TeamLeague = isTeamLeague(leagueParam) ? leagueParam : 'great';

	const data = useTeamsData(league);
	const ctx = useSimContext(league, data);
	const { team, setMember, setMove, removeMember, replaceTeam, recommendedMoveset } = useTeamState(data);
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
	const resetMoves = () => replaceTeam(team.map((slot) => ({ ...slot, moveset: recommendedMoveset(slot.speciesId) })));

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
			icon: (
				<svg
					viewBox='0 0 24 24'
					width='18'
					height='18'
					fill='none'
					stroke='currentColor'
					strokeWidth='2'
					strokeLinecap='round'
					strokeLinejoin='round'
					aria-hidden='true'
				>
					<path d='M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3' />
				</svg>
			),
		},
	];

	// Switching tabs keeps the league; a team only travels with a click on the list.
	const goToTab = (id: string) => {
		const next = new URLSearchParams();
		next.set('league', league);
		void navigate({ pathname: id === 'top' ? R.teamsTop : R.teams, search: `?${next.toString()}` });
	};

	const openFromTop = (team: RankedTeam) => {
		const next = new URLSearchParams();
		next.set('league', league);
		next.set('t', encodeTeam(team.members));
		void navigate({ pathname: R.teams, search: `?${next.toString()}` });
	};

	const leagueLabel = modeLabelLong(league, gl, []);
	const accent = modeColor(league);
	const verified = data.builder?.simulator.verified ?? true;

	return (
		<div
			className='r-shell r-shell--wide r-tm'
			data-mini={tab === 'builder' && analysis && parts && full ? '' : undefined}
		>
			<h1 className='r-page-title'>{t('teams:page.title')}</h1>

			<IconTabBar items={tabItems} activeId={tab} onSelect={goToTab} ariaLabel={t('teams:page.tabsAria')} />

			<div className='r-league-row r-tm-leagues'>
				<LeaguePicker
					items={leagueItems}
					activeId={league}
					onSelect={setLeague}
					ariaLabel={t('teams:page.leagueAria')}
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

			{data.ready && tab === 'builder' && (
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
						onRemove={removeMember}
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
							<button type='button' className='r-tm-btn r-tm-btn--ghost' onClick={() => void copyLink()}>
								{copied ? t('teams:builder.copied') : t('teams:builder.copyLink')}
							</button>
							<button type='button' className='r-tm-btn r-tm-btn--ghost' onClick={() => replaceTeam([])}>
								{t('teams:builder.clear')}
							</button>
							<button type='button' className='r-tm-btn r-tm-btn--ghost' onClick={resetMoves}>
								{t('teams:builder.resetMoves')}
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
								picks={suggestionsQuery.data}
								onApply={(pick) => setMember(pick.slot, pick.speciesId)}
							/>
						</>
					)}
				</>
			)}
		</div>
	);
};

export default Teams;
