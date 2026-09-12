-- 기기에만 있던 것들을 계정으로 옮겨요. 그리고 선생님을 다시 학생으로
-- 되돌릴 수 있게 해요.
--
-- 왜 필요했냐면, 다른 기기에서 로그인하면 앱이 처음 쓰는 사람처럼 굴었어요.
-- 학교도 반도 번호도 이미 적어뒀는데 또 물어봤어요. 그 값들이 기기 저장소에만
-- 있었거든요. 계정에는 학교 코드만 있고 이름이 없어서 화면에 뭘 보여줄지도
-- 몰랐어요.

-- 학교 이름이에요. 코드만으로는 화면에 '서일여자고등학교'를 못 써요.
-- NEIS에 코드로 다시 물어볼 수도 있지만, 한 번 받은 이름을 안 버리면
-- 그 왕복이 아예 없어요.
alter table public.profiles add column if not exists school_name text;
alter table public.profiles add column if not exists office_name text;

/*
 * 교시마다 내가 실제로 듣는 과목이에요.
 *
 * 선택과목은 반 단위로 등록돼서, 같은 반에서도 사람마다 다른 과목을 들어요.
 * 그걸 하나하나 고쳐둔 게 기기에만 있었어요. 폰을 바꾸면 처음부터 다시요.
 * 한 학기 분량을 다시 고치라는 건 좀 그래요.
 *
 * jsonb로 담아요. '월-6' 같은 열쇠에 과목 이름이 붙은 평평한 표라서
 * 칸을 따로 만들 이유가 없어요.
 */
alter table public.profiles add column if not exists swaps jsonb not null default '{}'::jsonb;

-- 가입 안내를 한 번 지나갔는지. 이것도 기기에만 있어서 새 기기마다 다시 떴어요.
alter table public.profiles add column if not exists setup_seen boolean not null default false;

notify pgrst, 'reload schema';

/*
 * 선생님을 다시 학생으로 되돌려요.
 *
 * 올리는 길(promote_to_teacher)만 있고 내리는 길이 없었어요. 실수로 코드를
 * 넣었거나, 더 이상 그 학교 선생님이 아니면 되돌릴 방법이 없었던 거예요.
 *
 * 되돌릴 때 담당 과목도 같이 비워요. 그게 쪽지가 누구에게 갈지 정하는
 * 값이라, 학생이 됐는데 남아 있으면 안 돼요.
 *
 * 그 선생님을 콕 집어 보낸 쪽지는 지정을 풀어요. 안 풀면 그 쪽지는 아무에게도
 * 안 보여요. 학생은 답을 기다리는데 받을 사람이 없는 거예요. 지정을 풀면
 * 그 과목 선생님들에게 다시 보여서 누구든 이어받을 수 있어요.
 * 계정을 지울 때와 같은 규칙이에요 (threads.teacher_id 의 on delete set null).
 *
 * 이 함수도 앱에서는 못 불러요. 우리 함수(service_role)만요. 남을 강등시킬
 * 수 있으면 안 되니까 부르는 쪽에서 "본인인지"를 먼저 봐요.
 */
create or replace function public.demote_to_student(target uuid)
returns setof public.profiles
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.threads
     set teacher_id = null, teacher_name = null
   where teacher_id = target;

  -- 트리거가 role 변경을 되돌리니 이 함수 안에서만 잠깐 꺼요.
  alter table public.profiles disable trigger profiles_keep_role;

  return query
    update public.profiles
       set role = 'student',
           subjects = '{}',
           teaches = '{}'
     where id = target
    returning *;

  alter table public.profiles enable trigger profiles_keep_role;
end;
$$;

revoke all on function public.demote_to_student(uuid) from public, anon, authenticated;
grant execute on function public.demote_to_student(uuid) to service_role;

notify pgrst, 'reload schema';
