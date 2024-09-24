import { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [visibleUsers, setVisibleUsers] = useState(5); 
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const usersCol = collection(db, "users");
      const userSnapshot = await getDocs(usersCol);
      const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllUsers(userList); 
      setUsers(userList.slice(0, visibleUsers)); 
    };
    fetchUsers();
  }, [visibleUsers]);

  const loadMoreUsers = () => {
    setVisibleUsers(prev => prev + 5); 
    setUsers(allUsers.slice(0, visibleUsers + 5)); 
  };

  const toggleBanUser = async (userId, isBanned) => {
    const confirmAction = window.confirm(
      `Are you sure you want to ${isBanned ? "unban" : "ban"} this user?`
    );
    if (confirmAction) {
      const userRef = doc(db, "users", userId);
      try {
        await updateDoc(userRef, { isBanned: !isBanned }); 
        
        setUsers(users.map(user => 
          user.id === userId ? { ...user, isBanned: !isBanned } : user
        ));
        setAllUsers(allUsers.map(user => 
          user.id === userId ? { ...user, isBanned: !isBanned } : user
        ));
      } catch (error) {
        console.error("Error updating user status:", error);
        alert("There was an error updating the user status. Please try again.");
      }
    }
  };

  


  return (
    <div className="p-4">
      <h1 className="text-2xl">Users</h1>
      <table className="min-w-full mt-4">
        <thead>
          <tr>
            <th className="border px-4 py-2">Profile Picture</th>
            <th className="border px-4 py-2">Name</th>
            <th className="border px-4 py-2">Email</th>
            <th className="border px-4 py-2">Phone</th>
            <th className="border px-4 py-2">Address</th>
            <th className="border px-4 py-2">Payment Methods</th>
            <th className="border px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td className="border px-4 py-2">
                {user.profilePic && (
                  <img src={user.profilePic} alt={`${user.name}'s profile`} className="w-12 h-12 rounded-full object-cover" />
                )}
              </td>
              <td className="border px-4 py-2">{user.name}</td>
              <td className="border px-4 py-2">{user.email}</td>
              <td className="border px-4 py-2">{user.phone}</td>
              <td className="border px-4 py-2">
                {user.address ? (
                  <>
                    {user.address.line1}, {user.address.line2}, {user.address.houseNo}, {user.address.city}, {user.address.state} - {user.address.pin}
                  </>
                ) : "N/A"}
              </td>
              <td className="border px-4 py-2">
                {user.paymentMethods && user.paymentMethods.length > 0 ? (
                  user.paymentMethods.map((method, index) => (
                    <div key={index}>
                      {method.cardNumber ? (
                        <div>
                          <p>Card Number: {method.cardNumber} ({method.type})</p>
                          <p>CVV: {method.cvv}</p>
                          <p>Expiry: {method.expiry}</p>
                        </div>
                      ) : (
                        <p>UPI: {method.upi}</p>
                      )}
                    </div>
                  ))
                ) : "N/A"}
              </td>
              <td className="border px-4 py-2">
                <button
                  onClick={() => toggleBanUser(user.id, user.isBanned)}
                  className={`px-3 py-1 rounded ${user.isBanned ? "bg-green-500" : "bg-red-500"} text-white hover:opacity-80 transition duration-200`}
                >
                  {user.isBanned ? "Unban" : "Ban"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Load More Button */}
      {visibleUsers < allUsers.length && (
        <div className="mt-4 text-center">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition duration-200"
            onClick={loadMoreUsers}
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
};

export default Users;
