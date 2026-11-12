/** 화면이 받는 조회 API 응답 형태(설계 5절·6.4절). 서버 DTO 타입을 그대로 가져온다(타입만). */
export type { AgentStatus } from '@/domain/types';
export type { SessionListItem, SessionsView, SessionDetailView, AgentView, ProjectView } from '@/query/views';
export type { PlanUsageView, PlanWindowView, PlanLevel } from '@/plan/view';
export type { CharactersView, CharacterView } from '@/characters/roles';
