import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Iter "mo:base/Iter";
import Result "mo:base/Result";

module {
    public type Role = {
        #Admin;
        #ReadOnly;
    };

    public class AuthorizationManager() {
        private var admins = Buffer.Buffer<Principal>(0);
        private var readOnlyUsers = Buffer.Buffer<Principal>(0);

        // Initialize with deployer as first admin
        public func initWithDeployer(deployer: Principal) {
            if (admins.size() == 0) {
                admins.add(deployer);
            };
        };

        // Check if caller is an admin
        public func isAdmin(caller: Principal) : Bool {
            for (admin in admins.vals()) {
                if (Principal.equal(caller, admin)) {
                    return true;
                };
            };
            return false;
        };

        // Check if caller has read-only access
        public func hasReadAccess(caller: Principal) : Bool {
            // Admins always have read access
            if (isAdmin(caller)) {
                return true;
            };

            // Check read-only users
            for (user in readOnlyUsers.vals()) {
                if (Principal.equal(caller, user)) {
                    return true;
                };
            };
            return false;
        };

        // Add a new admin (only admins can do this)
        public func addAdmin(caller: Principal, newAdmin: Principal) : Result.Result<(), Text> {
            if (not isAdmin(caller)) {
                return #err("Unauthorized: Only admins can add other admins");
            };

            // Check if already admin
            if (isAdmin(newAdmin)) {
                return #err("Principal is already an admin");
            };

            admins.add(newAdmin);
            return #ok();
        };

        // Remove an admin (only admins can do this, cannot remove yourself)
        public func removeAdmin(caller: Principal, adminToRemove: Principal) : Result.Result<(), Text> {
            if (not isAdmin(caller)) {
                return #err("Unauthorized: Only admins can remove admins");
            };

            if (Principal.equal(caller, adminToRemove)) {
                return #err("Cannot remove yourself as admin");
            };

            let newAdmins = Buffer.Buffer<Principal>(admins.size());
            var found = false;

            for (admin in admins.vals()) {
                if (not Principal.equal(admin, adminToRemove)) {
                    newAdmins.add(admin);
                } else {
                    found := true;
                };
            };

            if (not found) {
                return #err("Principal is not an admin");
            };

            admins := newAdmins;
            return #ok();
        };

        // Add read-only user
        public func addReadOnlyUser(caller: Principal, user: Principal) : Result.Result<(), Text> {
            if (not isAdmin(caller)) {
                return #err("Unauthorized: Only admins can add read-only users");
            };

            if (hasReadAccess(user)) {
                return #err("User already has access");
            };

            readOnlyUsers.add(user);
            return #ok();
        };

        // Remove read-only user
        public func removeReadOnlyUser(caller: Principal, user: Principal) : Result.Result<(), Text> {
            if (not isAdmin(caller)) {
                return #err("Unauthorized: Only admins can remove read-only users");
            };

            let newUsers = Buffer.Buffer<Principal>(readOnlyUsers.size());
            var found = false;

            for (u in readOnlyUsers.vals()) {
                if (not Principal.equal(u, user)) {
                    newUsers.add(u);
                } else {
                    found := true;
                };
            };

            if (not found) {
                return #err("User does not have read-only access");
            };

            readOnlyUsers := newUsers;
            return #ok();
        };

        // Get list of admins
        public func getAdmins() : [Principal] {
            Buffer.toArray(admins)
        };

        // Get list of read-only users
        public func getReadOnlyUsers() : [Principal] {
            Buffer.toArray(readOnlyUsers)
        };
    };
}
