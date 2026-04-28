export const BIGRAM_FREQ: Record<string, number> = {
  "the_house": 0.0012, "the_man": 0.0015, "the_time": 0.0018,
  "the_way": 0.0014, "the_world": 0.0011, "the_people": 0.0009,
  "the_door": 0.0008, "the_night": 0.0007, "the_room": 0.0008,
  "the_light": 0.0007, "the_end": 0.0009, "the_water": 0.0006,
  "the_fire": 0.0005, "the_old": 0.0008, "the_dark": 0.0005,
  "in_the": 0.0045, "of_the": 0.0052, "to_the": 0.0038,
  "on_the": 0.0025, "at_the": 0.0018, "is_the": 0.0015,
  "it_is": 0.0022, "it_was": 0.0025, "he_was": 0.0018,
  "she_was": 0.0012, "i_am": 0.0015, "i_was": 0.0012,
  "do_not": 0.0014, "can_not": 0.0008, "will_not": 0.0007,
  "is_not": 0.0009, "is_a": 0.0018, "is_on": 0.0006,
  "was_a": 0.0012, "come_here": 0.0004, "go_away": 0.0003,
  "help_me": 0.0003, "come_back": 0.0004, "get_out": 0.0004,
  "look_at": 0.0005, "go_to": 0.0006, "want_to": 0.0008,
  "have_to": 0.0007, "need_to": 0.0005, "try_to": 0.0004,
  "house_is": 0.0003, "door_is": 0.0002, "who_is": 0.0004,
  "what_is": 0.0005, "where_is": 0.0004, "how_is": 0.0002,
  "there_is": 0.0012, "here_is": 0.0004, "this_is": 0.0015,
  "that_is": 0.0008, "can_you": 0.0006, "do_you": 0.0008,
  "are_you": 0.0007, "did_you": 0.0005,
};

export function getBigramScore(w1: string, w2: string): number {
  const key = `${w1.toLowerCase()}_${w2.toLowerCase()}`;
  return BIGRAM_FREQ[key] || 0;
}
