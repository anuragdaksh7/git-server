package repository

import (
	"errors"
	"strings"
	"testing"
)

func TestCleanTreePath(t *testing.T) {
	cases := []struct {
		in      string
		want    string
		wantErr bool
	}{
		{"", "", false},
		{"/", "", false},
		{"src", "src", false},
		{"/src/app/", "src/app", false},
		{"  src/app  ", "src/app", false},
		{"../etc", "", true},
		{"src/../etc", "", true},
		{`src\app`, "", true},
		{"src//app", "", true},
	}

	for _, tc := range cases {
		got, err := cleanTreePath(tc.in)
		if tc.wantErr {
			if !errors.Is(err, ErrInvalidPath) {
				t.Errorf("cleanTreePath(%q): want ErrInvalidPath, got %v", tc.in, err)
			}
			continue
		}
		if err != nil {
			t.Errorf("cleanTreePath(%q): unexpected error %v", tc.in, err)
			continue
		}
		if got != tc.want {
			t.Errorf("cleanTreePath(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestParseTree(t *testing.T) {
	// shape of `git ls-tree -z` output
	out := []byte("100644 blob 587be6b4c3f93f93c489c0111bba5596147a26cb\tREADME.md\x00" +
		"040000 tree 3284e1f7a8e0e6cdcfc37173779ed6bef041e2b5\tsrc\x00")

	root := parseTree(out, "")
	if len(root) != 2 {
		t.Fatalf("root: got %d entries, want 2", len(root))
	}
	if root[0].FileName != "README.md" || root[0].Path != "README.md" {
		t.Errorf("root[0] = %+v", root[0])
	}
	if root[0].ObjectType != "blob" || root[0].FileMode != "100644" {
		t.Errorf("root[0] metadata = %+v", root[0])
	}
	if root[1].ObjectType != "tree" || root[1].Path != "src" {
		t.Errorf("root[1] = %+v", root[1])
	}

	sub := parseTree(out, "src")
	if len(sub) != 2 {
		t.Fatalf("sub: got %d entries, want 2", len(sub))
	}
	if sub[0].Path != "src/README.md" || sub[1].Path != "src/src" {
		t.Errorf("sub paths = %q, %q", sub[0].Path, sub[1].Path)
	}

	if got := parseTree(nil, ""); len(got) != 0 {
		t.Errorf("empty input: got %d entries, want 0", len(got))
	}
}

func TestSafeRef(t *testing.T) {
	valid := []string{"main", "feature/x", "release-1.0", "HEAD", "4e9e31a9f3b7c1d2e5a6b8c9d0e1f2a3b4c5d6e7"}
	for _, ref := range valid {
		if !safeRef(ref) {
			t.Errorf("safeRef(%q) = false, want true", ref)
		}
	}

	invalid := []string{"", "-upload-pack", "--max-count=1", "a b", "a\tb", "a\nb", strings.Repeat("a", 256)}
	for _, ref := range invalid {
		if safeRef(ref) {
			t.Errorf("safeRef(%q) = true, want false", ref)
		}
	}
}

func TestParseRefList(t *testing.T) {
	out := []byte("develop\nmain\nrelease/1.0\n\n")

	refs := parseRefList(out)
	want := []string{"develop", "main", "release/1.0"}
	if len(refs) != len(want) {
		t.Fatalf("got %d refs, want %d: %v", len(refs), len(want), refs)
	}
	for i := range want {
		if refs[i] != want[i] {
			t.Errorf("refs[%d] = %q, want %q", i, refs[i], want[i])
		}
	}

	if got := parseRefList(nil); len(got) != 0 {
		t.Errorf("empty input: got %d refs, want 0", len(got))
	}
}

func TestPreferredBranch(t *testing.T) {
	cases := []struct {
		branches []string
		want     string
	}{
		{[]string{"develop", "main"}, "main"},
		{[]string{"develop", "master"}, "master"},
		{[]string{"alpha", "zeta"}, "alpha"},
		{[]string{"feature/x", "main", "master"}, "main"},
	}
	for _, tc := range cases {
		if got := preferredBranch(tc.branches); got != tc.want {
			t.Errorf("preferredBranch(%v) = %q, want %q", tc.branches, got, tc.want)
		}
	}

	if containsString([]string{"main"}, "master") {
		t.Error("containsString reported a missing branch")
	}
	if !containsString([]string{"main", "master"}, "master") {
		t.Error("containsString missed an existing branch")
	}
}

func TestParseCommits(t *testing.T) {
	// two records, NUL separated; the first message contains a tab
	out := []byte("3f21dc49c7120b899baf2a0b62dcff1f5c978ca9\tAnurag Daksh\t2026-11-06T23:27:55+05:30\tsecond\twith tab\x00" +
		"107e3828326f4b472c45c017c03623ea5b3575b4\tAnurag Daksh\t2026-11-06T23:27:55+05:30\tfirst commit")

	commits := parseCommits(out)
	if len(commits) != 2 {
		t.Fatalf("got %d commits, want 2", len(commits))
	}
	if commits[0].SHA != "3f21dc49c7120b899baf2a0b62dcff1f5c978ca9" {
		t.Errorf("sha = %q", commits[0].SHA)
	}
	if commits[0].Author != "Anurag Daksh" {
		t.Errorf("author = %q", commits[0].Author)
	}
	if commits[0].Message != "second\twith tab" {
		t.Errorf("message = %q", commits[0].Message)
	}
	if commits[1].Message != "first commit" {
		t.Errorf("second message = %q", commits[1].Message)
	}
	if got := commits[0].Date.Format("2006-01-02"); got != "2026-11-06" {
		t.Errorf("date = %v", got)
	}

	// malformed records are skipped rather than failing the whole response
	if got := parseCommits([]byte("bad-date\tx\tnot-a-date\tmsg\x00")); len(got) != 0 {
		t.Errorf("malformed record: got %d commits, want 0", len(got))
	}
	if got := parseCommits(nil); len(got) != 0 {
		t.Errorf("empty input: got %d commits, want 0", len(got))
	}
}
